import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import db from '../utils/db';

// Los reportes son documentos visibles al usuario: los estados (enums internos
// en inglés) se traducen antes de escribirse en el PDF/CSV.
const ADOPTION_STATUS_ES: Record<string, string> = {
  RECEIVED: 'Recibida',
  INTERVIEW: 'Entrevista',
  VISIT: 'Visita',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
};

const ANIMAL_STATUS_ES: Record<string, string> = {
  QUARANTINE: 'Cuarentena',
  AVAILABLE: 'Disponible',
  TREATMENT: 'En tratamiento',
  ADOPTED: 'Adoptado',
  DECEASED: 'Fallecido',
};

const statusEs = (map: Record<string, string>, value: string) => map[value] ?? value;

// ─── Adoption Report ─────────────────────────────────────────────────────────

async function fetchAdoptionData(query: Record<string, unknown>) {
  const { from, to, species, status } = query;

  const where: Record<string, unknown> = {};
  if (status === 'APPROVED' || status === 'REJECTED') {
    where['status'] = status;
  } else {
    where['status'] = { in: ['APPROVED', 'REJECTED'] };
  }

  const dateFilter: Record<string, unknown> = {};
  if (from) dateFilter['gte'] = new Date(from as string);
  if (to) {
    const end = new Date(to as string);
    end.setHours(23, 59, 59, 999);
    dateFilter['lte'] = end;
  }
  if (Object.keys(dateFilter).length) where['updatedAt'] = dateFilter;

  const applications = await db.adoptionRequest.findMany({
    where: where as any,
    include: {
      animal: { select: { id: true, name: true, species: true } },
      adopter: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const filtered = species
    ? applications.filter((a) => a.animal.species.toLowerCase() === (species as string).toLowerCase())
    : applications;

  return filtered;
}

function buildAdoptionSummary(applications: Awaited<ReturnType<typeof fetchAdoptionData>>) {
  return {
    total: applications.length,
    approved: applications.filter((a) => a.status === 'APPROVED').length,
    rejected: applications.filter((a) => a.status === 'REJECTED').length,
  };
}

export const getAdoptionReport = async (req: Request, res: Response) => {
  const applications = await fetchAdoptionData(req.query);
  const summary = buildAdoptionSummary(applications);

  // Attach compatibility scores if available
  const adopterIds = [...new Set(applications.map((a) => a.adopterId))];
  const animalIds = [...new Set(applications.map((a) => a.animalId))];

  const scores = await db.compatibilityScore.findMany({
    where: { adopterId: { in: adopterIds }, animalId: { in: animalIds } },
  });
  const scoreMap = new Map(scores.map((s) => [`${s.adopterId}-${s.animalId}`, s.scorePercentage]));

  const enriched = applications.map((a) => ({
    ...a,
    compatibilityScore: scoreMap.get(`${a.adopterId}-${a.animalId}`) ?? null,
  }));

  res.json({ success: true, summary, applications: enriched });
};

// ─── Health Report ───────────────────────────────────────────────────────────

async function fetchHealthData(query: Record<string, unknown>) {
  const { species, treatmentActive, vaccinePending, from, to } = query;

  const animalWhere: Record<string, unknown> = {};
  if (treatmentActive === 'true') animalWhere['status'] = 'TREATMENT';
  if (species) animalWhere['species'] = { equals: species as string, mode: 'insensitive' };

  const vaccineWhere: Record<string, unknown> = {};
  if (vaccinePending === 'true') vaccineWhere['status'] = 'PENDING';
  if (from) vaccineWhere['nextDueAt'] = { ...(vaccineWhere['nextDueAt'] as any || {}), gte: new Date(from as string) };
  if (to) {
    const end = new Date(to as string);
    end.setHours(23, 59, 59, 999);
    vaccineWhere['nextDueAt'] = { ...(vaccineWhere['nextDueAt'] as any || {}), lte: end };
  }

  const animals = await db.animal.findMany({
    where: animalWhere as any,
    select: {
      id: true,
      name: true,
      species: true,
      status: true,
      vaccines: {
        where: Object.keys(vaccineWhere).length ? (vaccineWhere as any) : undefined,
        orderBy: { nextDueAt: 'asc' as const },
      },
      clinicalRecord: {
        include: {
          entries: { orderBy: { datetime: 'desc' as const }, take: 1 },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  if (vaccinePending === 'true') {
    return animals.filter((a) => a.vaccines.length > 0);
  }

  return animals;
}

function buildHealthSummary(animals: Awaited<ReturnType<typeof fetchHealthData>>) {
  const inTreatment = animals.filter((a) => a.status === 'TREATMENT').length;
  const withPendingVaccines = animals.filter((a) => a.vaccines.some((v: { status: string }) => v.status === 'PENDING')).length;
  const totalVaccinesPending = animals.reduce((sum, a) => sum + a.vaccines.filter((v: { status: string }) => v.status === 'PENDING').length, 0);
  return {
    totalAnimals: animals.length,
    inTreatment,
    withPendingVaccines,
    totalVaccinesPending,
  };
}

export const getHealthReport = async (req: Request, res: Response) => {
  const animals = await fetchHealthData(req.query);
  const summary = buildHealthSummary(animals);
  res.json({ success: true, summary, count: animals.length, animals });
};

// ─── Species list (for filter dropdowns) ─────────────────────────────────────

export const getSpeciesList = async (_req: Request, res: Response) => {
  const raw = await db.animal.findMany({
    distinct: ['species'],
    select: { species: true },
    orderBy: { species: 'asc' },
  });
  res.json({ success: true, species: raw.map((r) => r.species) });
};

// ─── PDF Export ──────────────────────────────────────────────────────────────

function drawTableRow(doc: PDFKit.PDFDocument, y: number, cols: string[], widths: number[], x0: number, bold = false) {
  const font = bold ? 'Helvetica-Bold' : 'Helvetica';
  let x = x0;
  for (let i = 0; i < cols.length; i++) {
    doc.font(font).fontSize(8).text(cols[i], x + 4, y + 4, { width: widths[i] - 8, lineBreak: false });
    x += widths[i];
  }
  return y + 18;
}

function drawTableHeader(doc: PDFKit.PDFDocument, y: number, cols: string[], widths: number[], x0: number) {
  doc.rect(x0, y, widths.reduce((a, b) => a + b, 0), 18).fill('#f3f4f6').fillColor('#111827');
  return drawTableRow(doc, y, cols, widths, x0, true);
}

export const exportAdoptionPdf = async (req: Request, res: Response) => {
  const applications = await fetchAdoptionData(req.query);
  if (applications.length === 0) {
    return res.status(400).json({ success: false, error: 'No hay datos para exportar con los filtros seleccionados.' });
  }

  const summary = buildAdoptionSummary(applications);

  const scores = await db.compatibilityScore.findMany({
    where: {
      adopterId: { in: [...new Set(applications.map((a) => a.adopterId))] },
      animalId: { in: [...new Set(applications.map((a) => a.animalId))] },
    },
  });
  const scoreMap = new Map(scores.map((s) => [`${s.adopterId}-${s.animalId}`, s.scorePercentage]));

  const doc = new PDFDocument({ margin: 50, size: 'LETTER', layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="reporte-adopciones.pdf"');
  doc.pipe(res);

  doc.fontSize(16).font('Helvetica-Bold').text('Reporte de Adopciones — Rescue Pet', { align: 'center' }).moveDown(0.3);
  doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
    .text(`Generado: ${new Date().toLocaleString('es-CR')} | Total: ${summary.total} | Aprobadas: ${summary.approved} | Rechazadas: ${summary.rejected}`, { align: 'center' })
    .fillColor('#111827').moveDown(1);

  const cols = ['Animal', 'Especie', 'Adoptante', 'Email', 'Estado', 'Afinidad', 'Fecha'];
  const widths = [100, 70, 120, 140, 70, 60, 80];
  const x0 = 50;
  let y = doc.y;
  y = drawTableHeader(doc, y, cols, widths, x0);

  for (const app of applications) {
    if (y > 520) {
      doc.addPage();
      y = 50;
      y = drawTableHeader(doc, y, cols, widths, x0);
    }
    const score = scoreMap.get(`${app.adopterId}-${app.animalId}`);
    const row = [
      app.animal.name,
      app.animal.species,
      app.adopter.fullName,
      app.adopter.email,
      statusEs(ADOPTION_STATUS_ES, app.status),
      score != null ? `${score.toFixed(0)}%` : '-',
      new Date(app.updatedAt).toLocaleDateString('es-CR'),
    ];
    y = drawTableRow(doc, y, row, widths, x0);
    doc.moveTo(x0, y).lineTo(x0 + widths.reduce((a, b) => a + b, 0), y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
  }

  doc.end();
};

export const exportHealthPdf = async (req: Request, res: Response) => {
  const animals = await fetchHealthData(req.query);
  if (animals.length === 0) {
    return res.status(400).json({ success: false, error: 'No hay datos para exportar con los filtros seleccionados.' });
  }

  const summary = buildHealthSummary(animals);

  const doc = new PDFDocument({ margin: 50, size: 'LETTER', layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="reporte-salud.pdf"');
  doc.pipe(res);

  doc.fontSize(16).font('Helvetica-Bold').text('Reporte de Salud — Rescue Pet', { align: 'center' }).moveDown(0.3);
  doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
    .text(`Generado: ${new Date().toLocaleString('es-CR')} | Animales: ${summary.totalAnimals} | En tratamiento: ${summary.inTreatment} | Vacunas pendientes: ${summary.totalVaccinesPending}`, { align: 'center' })
    .fillColor('#111827').moveDown(1);

  const cols = ['Animal', 'Especie', 'Estado', 'Vacunas pend.', 'Último diagnóstico', 'Último tratamiento'];
  const widths = [100, 80, 80, 80, 160, 160];
  const x0 = 50;
  let y = doc.y;
  y = drawTableHeader(doc, y, cols, widths, x0);

  for (const animal of animals) {
    if (y > 520) {
      doc.addPage();
      y = 50;
      y = drawTableHeader(doc, y, cols, widths, x0);
    }
    const pendingCount = animal.vaccines.filter((v: { status: string }) => v.status === 'PENDING').length;
    const lastEntry = animal.clinicalRecord?.entries?.[0];
    const row = [
      animal.name,
      animal.species,
      statusEs(ANIMAL_STATUS_ES, animal.status),
      String(pendingCount),
      lastEntry?.diagnosis ?? '-',
      lastEntry?.treatment ?? '-',
    ];
    y = drawTableRow(doc, y, row, widths, x0);
    doc.moveTo(x0, y).lineTo(x0 + widths.reduce((a, b) => a + b, 0), y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
  }

  doc.end();
};

// ─── CSV (Excel) Export ──────────────────────────────────────────────────────

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function toCsvRow(cells: string[]): string {
  return cells.map(escapeCsv).join(',');
}

export const exportAdoptionCsv = async (req: Request, res: Response) => {
  const applications = await fetchAdoptionData(req.query);
  if (applications.length === 0) {
    return res.status(400).json({ success: false, error: 'No hay datos para exportar con los filtros seleccionados.' });
  }

  const scores = await db.compatibilityScore.findMany({
    where: {
      adopterId: { in: [...new Set(applications.map((a) => a.adopterId))] },
      animalId: { in: [...new Set(applications.map((a) => a.animalId))] },
    },
  });
  const scoreMap = new Map(scores.map((s) => [`${s.adopterId}-${s.animalId}`, s.scorePercentage]));

  const header = toCsvRow(['Animal', 'Especie', 'Adoptante', 'Email', 'Estado', 'Afinidad %', 'Fecha']);
  const rows = applications.map((a) => {
    const score = scoreMap.get(`${a.adopterId}-${a.animalId}`);
    return toCsvRow([
      a.animal.name,
      a.animal.species,
      a.adopter.fullName,
      a.adopter.email,
      statusEs(ADOPTION_STATUS_ES, a.status),
      score != null ? score.toFixed(1) : '',
      new Date(a.updatedAt).toLocaleDateString('es-CR'),
    ]);
  });

  const bom = '﻿';
  const csv = bom + [header, ...rows].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="reporte-adopciones.csv"');
  res.send(csv);
};

export const exportHealthCsv = async (req: Request, res: Response) => {
  const animals = await fetchHealthData(req.query);
  if (animals.length === 0) {
    return res.status(400).json({ success: false, error: 'No hay datos para exportar con los filtros seleccionados.' });
  }

  const header = toCsvRow(['Animal', 'Especie', 'Estado', 'Vacunas pendientes', 'Último diagnóstico', 'Último tratamiento']);
  const rows = animals.map((a) => {
    const pending = a.vaccines.filter((v: { status: string }) => v.status === 'PENDING').length;
    const lastEntry = a.clinicalRecord?.entries?.[0];
    return toCsvRow([
      a.name,
      a.species,
      statusEs(ANIMAL_STATUS_ES, a.status),
      String(pending),
      lastEntry?.diagnosis ?? '',
      lastEntry?.treatment ?? '',
    ]);
  });

  const bom = '﻿';
  const csv = bom + [header, ...rows].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="reporte-salud.csv"');
  res.send(csv);
};
