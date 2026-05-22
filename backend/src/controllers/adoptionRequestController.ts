import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';
import { AdoptionRequestStatus, PetStatus } from '@prisma/client';

// Esquemas de validación
const createRequestSchema = z.object({
  petId: z.string().uuid(),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(AdoptionRequestStatus),
  rejectionReason: z.string().optional(),
});

// Estados activos (no terminales)
const ACTIVE_STATUSES: AdoptionRequestStatus[] = ['RECEIVED', 'INTERVIEW', 'VISIT'];

// Transiciones válidas de estado
const VALID_TRANSITIONS: Record<AdoptionRequestStatus, AdoptionRequestStatus[]> = {
  RECEIVED: ['INTERVIEW', 'REJECTED'],
  INTERVIEW: ['VISIT', 'REJECTED'],
  VISIT: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: [],
};

export const createAdoptionRequest = async (req: Request, res: Response) => {
  const role = req.user!.role;
  const userId = req.user!.id;

  if (role !== 'ADOPTER') {
    return res.status(403).json({ success: false, error: 'Solo los adoptantes pueden crear solicitudes de adopción' });
  }

  const parsed = createRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Datos inválidos', details: parsed.error.issues });
  }

  const { petId } = parsed.data;

  // Verificar que la mascota existe y está AVAILABLE
  const pet = await prisma.pet.findUnique({ where: { id: petId } });
  if (!pet) {
    return res.status(404).json({ success: false, error: 'Mascota no encontrada' });
  }

  if (pet.status !== PetStatus.AVAILABLE) {
    return res.status(400).json({ success: false, error: 'La mascota no está disponible para adopción' });
  }

  // Verificar que el adoptante no tenga una solicitud activa para esta mascota
  const existingRequest = await prisma.adoptionRequest.findFirst({
    where: {
      adopterId: userId,
      petId,
      status: { in: ACTIVE_STATUSES },
    },
  });

  if (existingRequest) {
    return res.status(400).json({ 
      success: false, 
      error: 'Ya tienes una solicitud activa para esta mascota',
      existingRequestId: existingRequest.id
    });
  }

  // Crear la solicitud
  const newRequest = await prisma.adoptionRequest.create({
    data: {
      adopterId: userId,
      petId,
      status: AdoptionRequestStatus.RECEIVED,
    },
    include: {
      pet: true,
      adopter: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  // Crear log de auditoría
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'CREATE_ADOPTION_REQUEST',
      entity: 'AdoptionRequest',
      entityId: newRequest.id,
      details: `Solicitud de adopción para mascota ${pet.name}`,
    },
  });

  // Crear notificación para los administradores
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', isActive: true },
  });

  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        title: 'Nueva solicitud de adopción',
        message: `${newRequest.adopter.fullName} ha solicitado adoptar a ${pet.name}`,
        type: 'INFO',
        link: `/admin/adoption-requests/${newRequest.id}`,
      },
    });
  }

  res.status(201).json({ success: true, request: newRequest });
};

export const getAdoptionRequests = async (req: Request, res: Response) => {
  const role = req.user!.role;
  const userId = req.user!.id;
  const statusFilter = req.query.status as string;

  const where: Record<string, unknown> = {};

  if (role === 'ADOPTER') {
    where['adopterId'] = userId;
  }

  if (statusFilter && Object.values(AdoptionRequestStatus).includes(statusFilter as AdoptionRequestStatus)) {
    where['status'] = statusFilter;
  }

  const requests = await prisma.adoptionRequest.findMany({
    where,
    include: {
      pet: {
        select: {
          id: true,
          name: true,
          species: true,
          breed: true,
          mainPhotoUrl: true,
          status: true,
        },
      },
      adopter: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, requests });
};

export const getAdoptionRequestById = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const role = req.user!.role;
  const userId = req.user!.id;

  const request = await prisma.adoptionRequest.findUnique({
    where: { id },
    include: {
      pet: {
        select: {
          id: true,
          name: true,
          species: true,
          breed: true,
          mainPhotoUrl: true,
          status: true,
          energyLevel: true,
          spaceNeed: true,
          goodWithChildren: true,
          goodWithPets: true,
        },
      },
      adopter: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
      documents: {
        select: {
          id: true,
          type: true,
          fileName: true,
          fileUrl: true,
          createdAt: true,
        },
      },
      contract: {
        select: {
          id: true,
          status: true,
          pdfUrl: true,
          signedPdfUrl: true,
          createdAt: true,
        },
      },
    },
  });

  if (!request) {
    return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
  }

  // ADOPTER solo puede ver sus propias solicitudes
  if (role === 'ADOPTER' && request.adopterId !== userId) {
    return res.status(403).json({ success: false, error: 'No tienes permiso para ver esta solicitud' });
  }

  res.json({ success: true, request });
};

export const getMyAdoptionRequests = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const statusFilter = req.query.status as string;

  const where: Record<string, unknown> = { adopterId: userId };

  if (statusFilter && Object.values(AdoptionRequestStatus).includes(statusFilter as AdoptionRequestStatus)) {
    where['status'] = statusFilter;
  }

  const requests = await prisma.adoptionRequest.findMany({
    where,
    include: {
      pet: {
        select: {
          id: true,
          name: true,
          species: true,
          breed: true,
          mainPhotoUrl: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, requests });
};

export const updateAdoptionRequestStatus = async (req: Request, res: Response) => {
  const role = req.user!.role;
  const userId = req.user!.id;
  const id = req.params['id'] as string;

  if (role !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'Solo los administradores pueden cambiar el estado de las solicitudes' });
  }

  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Datos inválidos', details: parsed.error.issues });
  }

  const { status, rejectionReason } = parsed.data;

  const request = await prisma.adoptionRequest.findUnique({
    where: { id },
    include: { pet: true, adopter: true },
  });

  if (!request) {
    return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
  }

  const currentStatus = request.status;
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];

  if (!allowedTransitions.includes(status)) {
    return res.status(400).json({ 
      success: false, 
      error: `Transición inválida de ${currentStatus} a ${status}. Transiciones permitidas: ${allowedTransitions.join(', ')}` 
    });
  }

  // Si se rechaza, se requiere motivo
  if (status === AdoptionRequestStatus.REJECTED && !rejectionReason) {
    return res.status(400).json({ success: false, error: 'Se debe proporcionar un motivo de rechazo' });
  }

  // Actualizar la solicitud
  const updatedRequest = await prisma.adoptionRequest.update({
    where: { id },
    data: {
      status,
      rejectionReason: status === AdoptionRequestStatus.REJECTED ? rejectionReason : null,
    },
    include: {
      pet: true,
      adopter: true,
    },
  });

  // Crear log de auditoría
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'UPDATE_ADOPTION_REQUEST_STATUS',
      entity: 'AdoptionRequest',
      entityId: id,
      details: `Cambio de estado de ${currentStatus} a ${status}${rejectionReason ? `. Motivo: ${rejectionReason}` : ''}`,
    },
  });

  // Notificar al adoptante sobre el cambio de estado
  let notificationTitle = '';
  let notificationMessage = '';
  let notificationType = 'INFO';

  switch (status) {
    case AdoptionRequestStatus.INTERVIEW:
      notificationTitle = 'Entrevista programada';
      notificationMessage = `Tu solicitud para adoptar a ${request.pet.name} ha pasado a la fase de entrevista`;
      notificationType = 'INFO';
      break;
    case AdoptionRequestStatus.VISIT:
      notificationTitle = 'Visita programada';
      notificationMessage = `Tu solicitud para adoptar a ${request.pet.name} ha pasado a la fase de visita`;
      notificationType = 'INFO';
      break;
    case AdoptionRequestStatus.APPROVED:
      notificationTitle = '¡Solicitud aprobada!';
      notificationMessage = `¡Felicidades! Tu solicitud para adoptar a ${request.pet.name} ha sido aprobada. Pronto recibirás más información sobre el contrato.`;
      notificationType = 'SUCCESS';
      break;
    case AdoptionRequestStatus.REJECTED:
      notificationTitle = 'Solicitud rechazada';
      notificationMessage = `Tu solicitud para adoptar a ${request.pet.name} ha sido rechazada. Motivo: ${rejectionReason}`;
      notificationType = 'WARNING';
      break;
  }

  await prisma.notification.create({
    data: {
      userId: request.adopterId,
      title: notificationTitle,
      message: notificationMessage,
      type: notificationType,
      link: `/adoption/my-requests`,
    },
  });

  // Si se aprueba, aquí se dispararía la generación del contrato
  // (se implementará en el módulo de contratos)
  if (status === AdoptionRequestStatus.APPROVED) {
    // Placeholder para generación de contrato
    console.log(`Contract generation should be triggered for request ${id}`);
  }

  res.json({ success: true, request: updatedRequest });
};
