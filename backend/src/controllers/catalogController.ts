import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getCatalog = async (req: Request, res: Response) => {
  const adopterId = req.user?.id;
  const { species, size, minAge, maxAge } = req.query;

  const where: Record<string, unknown> = { status: 'AVAILABLE' };
  if (species) where['species'] = species;
  if (size) where['size'] = size;
  if (minAge || maxAge) {
    where['estimatedAge'] = {};
    if (minAge) (where['estimatedAge'] as Record<string, unknown>)['gte'] = Number(minAge);
    if (maxAge) (where['estimatedAge'] as Record<string, unknown>)['lte'] = Number(maxAge);
  }

  const animals = await prisma.animal.findMany({
    where: where as any,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      species: true,
      estimatedBreed: true,
      estimatedAge: true,
      size: true,
      mainPhotoUrl: true,
      energyLevel: true,
      spaceNeed: true,
      goodWithChildren: true,
      goodWithPets: true,
      createdAt: true,
    },
  });

  // If adopter has compatibility scores, attach them
  if (adopterId) {
    const scores = await prisma.compatibilityScore.findMany({
      where: { adopterId, animalId: { in: animals.map((a) => a.id) } },
      select: { animalId: true, scorePercentage: true },
    });
    const scoreMap = Object.fromEntries(scores.map((s) => [s.animalId, s.scorePercentage]));

    const animalsWithScore = animals.map((a) => ({
      ...a,
      compatibilityScore: scoreMap[a.id] ?? null,
    }));

    if (scores.length > 0) {
      animalsWithScore.sort((a, b) => (b.compatibilityScore ?? 0) - (a.compatibilityScore ?? 0));
    }

    return res.json({ success: true, animals: animalsWithScore });
  }

  res.json({ success: true, animals: animals.map((a) => ({ ...a, compatibilityScore: null })) });
};

export const getCatalogAnimalById = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const adopterId = req.user?.id;

  const animal = await prisma.animal.findUnique({
    where: { id, status: 'AVAILABLE' },
    include: { gallery: true },
  });

  if (!animal) return res.status(404).json({ success: false, error: 'Animal no disponible' });

  let compatibilityScore = null;
  if (adopterId) {
    const score = await prisma.compatibilityScore.findUnique({
      where: { adopterId_animalId: { adopterId, animalId: id } },
    });
    compatibilityScore = score?.scorePercentage ?? null;
  }

  res.json({ success: true, animal: { ...animal, compatibilityScore } });
};
