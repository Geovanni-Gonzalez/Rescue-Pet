import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';
import type { AdoptionRequestStatus, DocumentType, AnimalStatus } from '../types/enums';
import { writeAuditLog, getClientIp } from '../services/auditService';
import { buildUploadUrl } from '../middlewares/upload';
import { generateContractPdf, generateSignedContractPdf, buildContractUrl } from '../services/pdfService';

const ADOPTION_REQUEST_STATUSES = ['RECEIVED', 'INTERVIEW', 'VISIT', 'APPROVED', 'REJECTED'] as const;
const DOCUMENT_TYPES = ['ID_CARD', 'ADDRESS_PROOF'] as const;

const createApplicationSchema = z.object({
  animalId: z.string().uuid(),
});

const updateStatusSchema = z.object({
  status: z.enum(ADOPTION_REQUEST_STATUSES),
  rejectionReason: z.string().optional(),
});

const signContractSchema = z.object({
  signatureImageUrl: z.string().min(1), // base64 data URL from canvas
});

const ACTIVE_STATUSES: AdoptionRequestStatus[] = ['RECEIVED', 'INTERVIEW', 'VISIT'];
const VALID_TRANSITIONS: Record<AdoptionRequestStatus, AdoptionRequestStatus[]> = {
  RECEIVED: ['INTERVIEW', 'REJECTED'],
  INTERVIEW: ['VISIT', 'REJECTED'],
  VISIT: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: [],
};
const REQUIRED_DOCUMENTS: DocumentType[] = ['ID_CARD', 'ADDRESS_PROOF'];

// ─── CU-16: Solicitud de adopción ─────────────────────────────────────────────

export const createApplication = async (req: Request, res: Response) => {
  const parsed = createApplicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Datos inválidos', details: parsed.error.issues });
  }

  const { animalId } = parsed.data;
  const adopterId = req.user!.id;

  const animal = await prisma.animal.findUnique({ where: { id: animalId } });
  if (!animal) return res.status(404).json({ success: false, error: 'Animal no encontrado' });

  if (animal.status !== 'AVAILABLE') {
    return res.status(400).json({ success: false, error: 'El animal no está disponible para adopción' });
  }

  const existing = await prisma.adoptionRequest.findFirst({
    where: { adopterId, animalId, status: { in: ACTIVE_STATUSES } },
  });

  if (existing) {
    return res.status(400).json({
      success: false,
      error: 'Ya tienes una solicitud activa para este animal',
      existingRequestId: existing.id,
    });
  }

  const application = await prisma.adoptionRequest.create({
    data: { adopterId, animalId, status: 'RECEIVED' },
    include: {
      animal: { select: { id: true, name: true, species: true } },
      adopter: { select: { id: true, fullName: true, email: true } },
    },
  });

  await writeAuditLog({
    userId: adopterId,
    action: 'CREATE_ADOPTION_APPLICATION',
    entityType: 'AdoptionRequest',
    entityId: application.id,
    ipAddress: getClientIp(req),
  });

  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' } });
  await Promise.all(
    admins.map((admin) =>
      prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'INFO',
          title: 'Nueva solicitud de adopción',
          message: `${application.adopter.fullName} solicitó adoptar a ${application.animal.name}`,
          resourceType: 'AdoptionRequest',
          resourceId: application.id,
        },
      })
    )
  );

  res.status(201).json({ success: true, application });
};

// ─── CU-18: Tablero de seguimiento ────────────────────────────────────────────

export const getApplications = async (req: Request, res: Response) => {
  const { role, id: userId } = req.user!;
  const { status, animalId, adopterId: queryAdopterId } = req.query;

  const where: Record<string, unknown> = {};
  if (role === 'ADOPTER') where['adopterId'] = userId;
  if (role === 'ADMIN' && queryAdopterId) where['adopterId'] = queryAdopterId;
  if (animalId) where['animalId'] = animalId;
  if (status && ADOPTION_REQUEST_STATUSES.includes(status as AdoptionRequestStatus)) {
    where['status'] = status;
  }

  const applications = await prisma.adoptionRequest.findMany({
    where: where as any,
    include: {
      animal: { select: { id: true, name: true, species: true, mainPhotoUrl: true, status: true } },
      adopter: { select: { id: true, fullName: true, email: true, phone: true } },
      interviewSlot: { select: { id: true, startsAt: true, endsAt: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, applications });
};

export const getApplicationById = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const { role, id: userId } = req.user!;

  const application = await prisma.adoptionRequest.findUnique({
    where: { id },
    include: {
      animal: {
        select: {
          id: true, name: true, species: true, estimatedBreed: true,
          mainPhotoUrl: true, status: true, energyLevel: true,
          spaceNeed: true, goodWithChildren: true, goodWithPets: true,
        },
      },
      adopter: { select: { id: true, fullName: true, email: true, phone: true } },
      documents: {
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          documentType: true,
          fileName: true,
          version: true,
          uploadedAt: true,
          // fileUrl only exposed to ADMIN
          fileUrl: role === 'ADMIN',
          status: true,
        },
      },
      contract: {
        select: { id: true, status: true, pdfUrl: true, signedPdfUrl: true, createdAt: true, signedAt: true },
      },
      interviewSlot: { select: { id: true, startsAt: true, endsAt: true, status: true } },
    },
  });

  if (!application) return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
  if (role === 'ADOPTER' && application.adopterId !== userId) {
    return res.status(403).json({ success: false, error: 'Acceso no autorizado' });
  }

  res.json({ success: true, application });
};

export const updateApplicationStatus = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const userId = req.user!.id;

  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Datos inválidos' });

  const { status, rejectionReason } = parsed.data;

  const application = await prisma.adoptionRequest.findUnique({
    where: { id },
    include: { animal: true, adopter: true },
  });
  if (!application) return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });

  const allowed = VALID_TRANSITIONS[application.status as AdoptionRequestStatus];
  if (!allowed.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `Transición inválida de ${application.status} a ${status}. Permitidas: ${allowed.join(', ')}`,
    });
  }

  if (status === 'REJECTED' && !rejectionReason) {
    return res.status(400).json({ success: false, error: 'Se requiere motivo de rechazo.' });
  }

  if (status === 'APPROVED') {
    const docs = await prisma.adopterDocument.findMany({
      where: { applicationId: id, status: 'ACTIVE' },
      select: { documentType: true },
    });
    const uploaded = new Set(docs.map((d) => d.documentType));
    const missing = REQUIRED_DOCUMENTS.filter((t) => !uploaded.has(t));
    if (missing.length > 0) {
      return res.status(400).json({ success: false, error: 'Faltan documentos requeridos.', missing });
    }
  }

  const updated = await prisma.adoptionRequest.update({
    where: { id },
    data: { status, rejectionReason: status === 'REJECTED' ? rejectionReason : null },
    include: {
      animal: true,
      adopter: true,
      documents: { where: { status: 'ACTIVE' } },
      contract: true,
      interviewSlot: true,
    },
  });

  await writeAuditLog({
    userId,
    action: 'UPDATE_APPLICATION_STATUS',
    entityType: 'AdoptionRequest',
    entityId: id,
    metadata: { from: application.status, to: status, rejectionReason },
    ipAddress: getClientIp(req),
  });

  // Notify adopter
  const notifMap: Record<string, { title: string; type: string }> = {
    INTERVIEW: { title: 'Solicitud en fase de entrevista', type: 'INFO' },
    VISIT: { title: 'Solicitud en fase de visita', type: 'INFO' },
    APPROVED: { title: '¡Solicitud aprobada!', type: 'SUCCESS' },
    REJECTED: { title: 'Solicitud rechazada', type: 'WARNING' },
  };
  const notif = notifMap[status];
  if (notif) {
    await prisma.notification.create({
      data: {
        userId: application.adopterId,
        type: notif.type,
        title: notif.title,
        message: `Tu solicitud para adoptar a ${application.animal.name} cambió a estado: ${status}.`,
        resourceType: 'AdoptionRequest',
        resourceId: id,
      },
    });
  }

  // CU-20: Auto-generate contract PDF on APPROVED
  if (status === 'APPROVED') {
    try {
      const pdfFilename = await generateContractPdf({
        applicationId: id,
        animalName: application.animal.name,
        animalSpecies: application.animal.species,
        adopterName: application.adopter.fullName,
        adopterEmail: application.adopter.email,
        generatedAt: new Date(),
      });
      const pdfUrl = buildContractUrl(pdfFilename);

      await prisma.adoptionContract.upsert({
        where: { applicationId: id },
        update: { pdfUrl },
        create: {
          applicationId: id,
          animalId: application.animalId,
          adopterId: application.adopterId,
          pdfUrl,
        },
      });
    } catch (err) {
      // If PDF generation fails, contract record still created but without URL
      console.error('[PDF] Contract generation failed:', err);
      await prisma.adoptionContract.upsert({
        where: { applicationId: id },
        update: {},
        create: {
          applicationId: id,
          animalId: application.animalId,
          adopterId: application.adopterId,
        },
      });
    }
  }

  res.json({ success: true, application: updated });
};

// ─── CU-19: Repositorio documental ────────────────────────────────────────────

export const uploadDocument = async (req: Request, res: Response) => {
  const applicationId = req.params['id'] as string;
  const { role, id: userId } = req.user!;

  const file = req.file;
  if (!file) return res.status(400).json({ success: false, error: 'No se recibió ningún archivo.' });

  const rawType = (req.body.documentType as string | undefined) ?? '';
  if (!DOCUMENT_TYPES.includes(rawType as DocumentType)) {
    return res.status(400).json({ success: false, error: `documentType debe ser uno de: ${DOCUMENT_TYPES.join(', ')}` });
  }
  const documentType = rawType as DocumentType;

  const application = await prisma.adoptionRequest.findUnique({
    where: { id: applicationId },
    include: { adopter: true, animal: true },
  });
  if (!application) return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });

  if (role !== 'ADMIN' && application.adopterId !== userId) {
    return res.status(403).json({ success: false, error: 'Sin permiso para cargar documentos a esta solicitud.' });
  }

  if (!ACTIVE_STATUSES.includes(application.status as AdoptionRequestStatus)) {
    return res.status(400).json({ success: false, error: 'Solo se pueden cargar documentos en solicitudes activas.' });
  }

  // Archive previous version of same type
  const previous = await prisma.adopterDocument.findFirst({
    where: { applicationId, documentType, status: 'ACTIVE' },
    orderBy: { version: 'desc' },
  });
  const nextVersion = (previous?.version ?? 0) + 1;
  if (previous) {
    await prisma.adopterDocument.update({ where: { id: previous.id }, data: { status: 'ARCHIVED' } });
  }

  const fileUrl = buildUploadUrl('documents', file.filename);

  const document = await prisma.adopterDocument.create({
    data: {
      adopterId: application.adopterId,
      applicationId,
      documentType,
      fileUrl,
      fileName: file.originalname,
      version: nextVersion,
    },
  });

  await writeAuditLog({
    userId,
    action: 'UPLOAD_DOCUMENT',
    entityType: 'AdopterDocument',
    entityId: document.id,
    metadata: { type: document.documentType, version: nextVersion },
    ipAddress: getClientIp(req),
  });

  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' } });
  await Promise.all(
    admins.map((admin) =>
      prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'INFO',
          title: 'Documento cargado',
          message: `${application.adopter.fullName} cargó ${document.fileName} para ${application.animal.name}`,
          resourceType: 'AdopterDocument',
          resourceId: document.id,
        },
      })
    )
  );

  res.status(201).json({ success: true, document });
};

export const getDocuments = async (req: Request, res: Response) => {
  const applicationId = req.params['id'] as string;
  const { role, id: userId } = req.user!;

  const application = await prisma.adoptionRequest.findUnique({ where: { id: applicationId } });
  if (!application) return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });

  if (role === 'ADOPTER' && application.adopterId !== userId) {
    return res.status(403).json({ success: false, error: 'Acceso denegado.' });
  }

  const documents = await prisma.adopterDocument.findMany({
    where: { applicationId },
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true,
      documentType: true,
      fileName: true,
      version: true,
      status: true,
      uploadedAt: true,
      fileUrl: role === 'ADMIN', // adoptante solo ve metadatos
    },
  });

  res.json({ success: true, documents });
};

// ─── CU-20: Contrato de adopción ──────────────────────────────────────────────

export const generateContract = async (req: Request, res: Response) => {
  const applicationId = req.params['id'] as string;

  const application = await prisma.adoptionRequest.findUnique({
    where: { id: applicationId },
    include: { animal: true, adopter: { select: { fullName: true, email: true } } },
  });

  if (!application) return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
  if (application.status !== 'APPROVED') {
    return res.status(400).json({ success: false, error: 'Solo se puede generar contrato para solicitudes aprobadas.' });
  }

  try {
    const pdfFilename = await generateContractPdf({
      applicationId,
      animalName: application.animal.name,
      animalSpecies: application.animal.species,
      adopterName: application.adopter.fullName,
      adopterEmail: application.adopter.email,
      generatedAt: new Date(),
    });

    const pdfUrl = buildContractUrl(pdfFilename);

    const contract = await prisma.adoptionContract.upsert({
      where: { applicationId },
      update: { pdfUrl },
      create: {
        applicationId,
        animalId: application.animalId,
        adopterId: application.adopterId,
        pdfUrl,
      },
    });

    res.json({ success: true, contract });
  } catch (err) {
    console.error('[PDF] generateContract error:', err);
    res.status(500).json({ success: false, error: 'Error al generar el contrato PDF.' });
  }
};

export const getContract = async (req: Request, res: Response) => {
  const applicationId = req.params['id'] as string;
  const { role, id: userId } = req.user!;

  const application = await prisma.adoptionRequest.findUnique({ where: { id: applicationId } });
  if (!application) return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });

  if (role === 'ADOPTER' && application.adopterId !== userId) {
    return res.status(403).json({ success: false, error: 'Acceso denegado.' });
  }

  const contract = await prisma.adoptionContract.findUnique({ where: { applicationId } });
  if (!contract) return res.status(404).json({ success: false, error: 'Contrato no generado aún.' });

  res.json({ success: true, contract });
};

export const signContract = async (req: Request, res: Response) => {
  const applicationId = req.params['id'] as string;
  const userId = req.user!.id;

  const parsed = signContractSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Firma inválida' });

  const application = await prisma.adoptionRequest.findUnique({
    where: { id: applicationId },
    include: { animal: true, adopter: { select: { fullName: true, email: true } }, contract: true },
  });

  if (!application) return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
  if (application.adopterId !== userId) return res.status(403).json({ success: false, error: 'Solo el adoptante puede firmar.' });
  if (application.status !== 'APPROVED' || !application.contract) {
    return res.status(400).json({ success: false, error: 'El contrato solo puede firmarse cuando la solicitud está aprobada.' });
  }

  // Generate signed PDF with embedded signature
  let signedPdfUrl: string;
  try {
    const signedFilename = await generateSignedContractPdf({
      applicationId,
      animalName: application.animal.name,
      animalSpecies: application.animal.species,
      adopterName: application.adopter.fullName,
      adopterEmail: application.adopter.email,
      generatedAt: new Date(application.contract.createdAt),
      signatureDataUrl: parsed.data.signatureImageUrl,
      signedAt: new Date(),
    });
    signedPdfUrl = buildContractUrl(signedFilename);
  } catch (err) {
    console.error('[PDF] signContract error:', err);
    // Fallback: still record the signature even if PDF generation fails
    signedPdfUrl = `/contracts/adoption-${applicationId}-signed.pdf`;
  }

  const [contract] = await prisma.$transaction([
    prisma.adoptionContract.update({
      where: { applicationId },
      data: {
        signatureImageUrl: parsed.data.signatureImageUrl,
        signedPdfUrl,
        status: 'SIGNED',
        signedAt: new Date(),
      },
    }),
    prisma.animal.update({ where: { id: application.animalId }, data: { status: 'ADOPTED' as AnimalStatus } }),
    prisma.animalStatusHistory.create({
      data: {
        animalId: application.animalId,
        previousStatus: 'AVAILABLE',
        newStatus: 'ADOPTED',
        changedByUserId: userId,
        reason: 'Contrato de adopción firmado',
      },
    }),
    prisma.auditLog.create({
      data: {
        userId,
        action: 'SIGN_CONTRACT',
        entityType: 'AdoptionContract',
        entityId: application.contract.id,
        metadataJson: JSON.stringify({ applicationId }),
        ipAddress: getClientIp(req),
      },
    }),
  ]);

  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' } });
  await Promise.all(
    admins.map((admin) =>
      prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'SUCCESS',
          title: 'Contrato firmado',
          message: `${application.adopter.fullName} firmó el contrato de adopción de ${application.animal.name}`,
          resourceType: 'AdoptionContract',
          resourceId: application.contract!.id,
        },
      })
    )
  );

  res.json({ success: true, contract });
};
