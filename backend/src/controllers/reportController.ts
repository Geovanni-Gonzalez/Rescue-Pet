import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getAdoptionReport = async (req: Request, res: Response) => {
  const { from, to, species } = req.query;

  const where: Record<string, unknown> = { status: { in: ['APPROVED', 'REJECTED'] } };
  const dateFilter: Record<string, unknown> = {};
  if (from) dateFilter['gte'] = new Date(from as string);
  if (to) dateFilter['lte'] = new Date(to as string);
  if (Object.keys(dateFilter).length) where['updatedAt'] = dateFilter;

  const applications = await prisma.adoptionRequest.findMany({
    where: where as any,
    include: {
      animal: { select: { id: true, name: true, species: true } },
      adopter: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const filtered = species ? applications.filter((a) => a.animal.species === species) : applications;

  const summary = {
    total: filtered.length,
    approved: filtered.filter((a) => a.status === 'APPROVED').length,
    rejected: filtered.filter((a) => a.status === 'REJECTED').length,
  };

  res.json({ success: true, summary, applications: filtered });
};

export const getHealthReport = async (req: Request, res: Response) => {
  const { treatmentActive, vaccinePending } = req.query;

  const animals = await prisma.animal.findMany({
    where: treatmentActive === 'true' ? { status: 'TREATMENT' } : {},
    select: {
      id: true,
      name: true,
      species: true,
      status: true,
      vaccines: vaccinePending === 'true' ? { where: { status: 'PENDING' } } : false,
      clinicalRecord: { include: { entries: { orderBy: { datetime: 'desc' }, take: 1 } } },
    },
  });

  res.json({ success: true, count: animals.length, animals });
};
