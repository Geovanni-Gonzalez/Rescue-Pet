import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';

const testSchema = z.object({
  housingType: z.string(),
  hasYard: z.boolean(),
  childrenCount: z.number().int().min(0),
  hasOtherPets: z.boolean(),
  dailyAvailableTime: z.number().min(0),
  allergies: z.string().optional(),
  experienceLevel: z.string(),
});

function calculateCompatibility(test: z.infer<typeof testSchema>, animal: {
  spaceNeed: string | null;
  goodWithChildren: boolean;
  goodWithPets: boolean;
  energyLevel: string | null;
}): { score: number; explanation: string } {
  let score = 50;
  const explanations: string[] = [];

  if (animal.spaceNeed === 'LARGE') {
    if (test.hasYard || test.housingType === 'HOUSE') {
      score += 15;
      explanations.push('Tienes el espacio ideal para este animal.');
    } else {
      score -= 15;
      explanations.push('Este animal requiere mucho espacio.');
    }
  }

  if (test.childrenCount > 0) {
    if (animal.goodWithChildren) {
      score += 15;
      explanations.push('Excelente opción para hogares con niños.');
    } else {
      score -= 15;
      explanations.push('No recomendado para hogares con niños pequeños.');
    }
  }

  if (test.hasOtherPets) {
    if (animal.goodWithPets) {
      score += 10;
      explanations.push('Se lleva bien con otras mascotas.');
    } else {
      score -= 10;
      explanations.push('Prefiere ser la única mascota en el hogar.');
    }
  }

  if (animal.energyLevel === 'HIGH') {
    if (test.dailyAvailableTime >= 2) {
      score += 10;
      explanations.push('Tu tiempo disponible se ajusta a su nivel de energía.');
    } else {
      score -= 10;
      explanations.push('Requiere más tiempo diario del que dispones.');
    }
    if (test.experienceLevel === 'EXPERIENCED') {
      score += 10;
      explanations.push('Tu experiencia te ayudará a manejar su energía.');
    }
  } else if (animal.energyLevel === 'LOW' && test.dailyAvailableTime <= 2) {
    score += 10;
    explanations.push('Ideal para tu disponibilidad de tiempo.');
  }

  if (test.allergies && test.allergies.trim().length > 0) {
    score -= 20;
    explanations.push('Advertencia: Consulta al refugio sobre alergias antes de adoptar.');
  }

  const scorePercentage = Math.max(0, Math.min(100, score));
  const explanation = explanations.length > 0 ? explanations.join(' ') : 'Afinidad promedio.';
  return { score: scorePercentage, explanation };
}

export const getMyTest = async (req: Request, res: Response) => {
  const adopterId = req.user!.id;
  const test = await prisma.compatibilityTest.findUnique({ where: { adopterId } });
  res.json({ success: true, test });
};

export const saveTestAndRecalculate = async (req: Request, res: Response) => {
  const adopterId = req.user!.id;

  const parsed = testSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Datos de test inválidos', details: parsed.error.issues });
  }

  const test = await prisma.compatibilityTest.upsert({
    where: { adopterId },
    update: parsed.data,
    create: { ...parsed.data, adopterId },
  });

  const availableAnimals = await prisma.animal.findMany({ where: { status: 'AVAILABLE' } });

  for (const animal of availableAnimals) {
    const { score, explanation } = calculateCompatibility(parsed.data, animal);
    await prisma.compatibilityScore.upsert({
      where: { adopterId_animalId: { adopterId, animalId: animal.id } },
      update: { scorePercentage: score, explanation },
      create: { adopterId, animalId: animal.id, scorePercentage: score, explanation },
    });
  }

  res.json({ success: true, test, message: 'Test guardado y compatibilidad calculada.' });
};

export const getCompatibilityResults = async (req: Request, res: Response) => {
  const adopterId = req.user!.id;
  const scores = await prisma.compatibilityScore.findMany({
    where: { adopterId },
    include: { animal: { select: { id: true, name: true, species: true, mainPhotoUrl: true } } },
    orderBy: { scorePercentage: 'desc' },
  });
  res.json({ success: true, scores });
};
