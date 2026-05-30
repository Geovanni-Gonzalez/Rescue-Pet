import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getGallery = async (req: Request, res: Response) => {
  const animalId = req.params['id'] as string;
  const gallery = await prisma.animalGallery.findMany({
    where: { animalId },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ success: true, gallery });
};

export const addGalleryImage = async (req: Request, res: Response) => {
  const animalId = req.params['id'] as string;
  const { fileUrl, fileType } = req.body;

  if (!fileUrl || !fileType) {
    return res.status(400).json({ success: false, error: 'fileUrl y fileType son requeridos.' });
  }

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  if (!ALLOWED_TYPES.includes(fileType)) {
    return res.status(400).json({ success: false, error: `Tipo de archivo no permitido. Usa: ${ALLOWED_TYPES.join(', ')}` });
  }

  const animal = await prisma.animal.findUnique({ where: { id: animalId } });
  if (!animal) return res.status(404).json({ success: false, error: 'Animal no encontrado' });

  const image = await prisma.animalGallery.create({
    data: { animalId, fileUrl, fileType, isMain: false, uploadedByUserId: req.user!.id },
  });

  res.status(201).json({ success: true, image });
};

export const deleteGalleryImage = async (req: Request, res: Response) => {
  const { id: animalId, imageId } = req.params as { id: string; imageId: string };

  const image = await prisma.animalGallery.findUnique({ where: { id: imageId } });
  if (!image || image.animalId !== animalId) {
    return res.status(404).json({ success: false, error: 'Imagen no encontrada' });
  }

  if (image.isMain) {
    return res.status(400).json({ success: false, error: 'No se puede eliminar la fotografía principal.' });
  }

  await prisma.animalGallery.delete({ where: { id: imageId } });
  res.json({ success: true, message: 'Imagen eliminada' });
};
