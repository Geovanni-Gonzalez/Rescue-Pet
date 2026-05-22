import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';

const testSchema = z.object({
  housingType: z.string(),
  hasYard: z.boolean(),
  childrenCount: z.number().int().min(0),
  hasOtherPets: z.boolean(),
  dailyAvailableTime: z.number().min(0),  // Permite decimales (ej: 1.5 horas)
  allergies: z.string().optional(),
  experienceLevel: z.string(),
});

function calculateCompatibility(test: any, pet: any): { score: number, explanation: string } {
  let score = 50;
  let explanations: string[] = [];

  // Espacio
  if (pet.spaceNeed === 'LARGE') {
    if (test.hasYard || test.housingType === 'HOUSE') {
      score += 15;
      explanations.push('Tienes el espacio ideal para esta mascota.');
    } else if (test.housingType === 'APARTMENT' && !test.hasYard) {
      score -= 15;
      explanations.push('Esta mascota requiere mucho espacio (patio o casa grande).');
    }
  }

  // Niños
  if (test.childrenCount > 0) {
    if (pet.goodWithChildren) {
      score += 15;
      explanations.push('Excelente opción para hogares con niños.');
    } else {
      score -= 15;
      explanations.push('No recomendado para hogares con niños pequeños.');
    }
  }

  // Otras Mascotas
  if (test.hasOtherPets) {
    if (pet.goodWithPets) {
      score += 10;
      explanations.push('Se lleva bien con otras mascotas.');
    } else {
      score -= 10;
      explanations.push('Prefiere ser la única mascota en el hogar.');
    }
  }

  // Tiempo y Energía
  if (pet.energyLevel === 'HIGH') {
    if (test.dailyAvailableTime < 2) {
      score -= 10;
      explanations.push('Requiere más tiempo diario del que dispones actualmente.');
    } else {
      score += 10;
      explanations.push('Tu tiempo disponible se ajusta a su nivel de energía.');
    }
    
    if (test.experienceLevel === 'EXPERIENCED') {
      score += 10;
      explanations.push('Tu experiencia te ayudará a manejar su energía.');
    }
  } else if (pet.energyLevel === 'LOW' && test.dailyAvailableTime <= 2) {
    score += 10;
    explanations.push('Ideal para tu disponibilidad de tiempo.');
  }

  // Alergias
  if (test.allergies && test.allergies.trim().length > 0) {
    score -= 20;
    explanations.push('Advertencia: Revisa con el refugio sobre alergias antes de adoptar.');
  }

  // Asegurar límites
  if (score > 100) score = 100;
  if (score < 0) score = 0;

  const finalExplanation = explanations.length > 0 
    ? explanations.join(' ') 
    : 'Afinidad promedio.';

  return { score, explanation: finalExplanation };
}

export const getMyTest = async (req: Request, res: Response) => {
  const adopterId = req.user!.id;
  
  const test = await prisma.compatibilityTest.findFirst({
    where: { adopterId }
  });

  res.json({ success: true, test });
};

export const saveTestAndCalculate = async (req: Request, res: Response) => {
  const adopterId = req.user!.id;

  const parsed = testSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Datos de test inválidos', details: parsed.error.issues });
  }

  // Upsert test
  let test = await prisma.compatibilityTest.findFirst({ where: { adopterId } });
  
  if (test) {
    test = await prisma.compatibilityTest.update({
      where: { id: test.id },
      data: parsed.data
    });
  } else {
    test = await prisma.compatibilityTest.create({
      data: {
        ...parsed.data,
        adopterId
      }
    });
  }

  // Obtener todas las mascotas disponibles
  const availablePets = await prisma.pet.findMany({
    where: { status: 'AVAILABLE' }
  });

  // Calcular score para cada mascota y guardar
  for (const pet of availablePets) {
    const { score, explanation } = calculateCompatibility(test, pet);
    
    // Upsert score
    const existingScore = await prisma.compatibilityScore.findFirst({
      where: { adopterId, petId: pet.id }
    });

    if (existingScore) {
      await prisma.compatibilityScore.update({
        where: { id: existingScore.id },
        data: { score, explanation }
      });
    } else {
      await prisma.compatibilityScore.create({
        data: {
          adopterId,
          petId: pet.id,
          score,
          explanation
        }
      });
    }
  }

  res.json({ success: true, test, message: 'Test guardado y compatibilidad calculada.' });
};

export const getCatalog = async (req: Request, res: Response) => {
  const adopterId = req.user!.id;

  // Obtener mascotas disponibles
  const pets = await prisma.pet.findMany({
    where: { status: 'AVAILABLE' }
  });

  // Obtener scores del adoptante
  const scores = await prisma.compatibilityScore.findMany({
    where: { adopterId }
  });

  const scoresMap = new Map();
  scores.forEach(s => scoresMap.set(s.petId, { score: s.score, explanation: s.explanation }));

  // Combinar y ordenar
  const catalog = pets.map(pet => {
    const s = scoresMap.get(pet.id);
    return {
      ...pet,
      compatibilityScore: s ? s.score : null,
      compatibilityExplanation: s ? s.explanation : null
    };
  });

  // Ordenar por score de mayor a menor, si no hay score van al final
  catalog.sort((a, b) => {
    if (a.compatibilityScore !== null && b.compatibilityScore !== null) {
      return b.compatibilityScore - a.compatibilityScore;
    }
    if (a.compatibilityScore !== null) return -1;
    if (b.compatibilityScore !== null) return 1;
    return 0;
  });

  res.json({ success: true, catalog });
};
