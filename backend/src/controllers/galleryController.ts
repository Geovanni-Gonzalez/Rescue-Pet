import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { uploadsRoot } from '../utils/uploadsRoot';
import * as uploadStorage from '../middlewares/upload';

async function persistGalleryPhoto(file: Express.Multer.File) {
  return uploadStorage.persistUploadedFile
    ? uploadStorage.persistUploadedFile('gallery', file)
    : uploadStorage.buildUploadUrl('gallery', file.filename);
}

export const getGallery = async (req: Request, res: Response) => {
  const animalId = req.params['id'] as string;
  const gallery = await prisma.animalGallery.findMany({
    where: { animalId },
    orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
  });
  res.json({ success: true, gallery });
};

export const addGalleryImages = async (req: Request, res: Response) => {
  const animalId = req.params['id'] as string;

  const animal = await prisma.animal.findUnique({ where: { id: animalId } });
  if (!animal) {
    // Clean up any uploaded files
    const files = (req.files as Express.Multer.File[]) ?? [];
    files.forEach((f) => uploadStorage.cleanupUpload(f.path));
    return res.status(404).json({ success: false, error: 'Animal no encontrado' });
  }

  const files = (req.files as Express.Multer.File[]) ?? [];
  if (files.length === 0) {
    return res.status(400).json({ success: false, error: 'Se requiere al menos una imagen.' });
  }

  const created = await Promise.all(
    files.map(async (file) =>
      prisma.animalGallery.create({
        data: {
          animalId,
          fileUrl: await persistGalleryPhoto(file),
          fileType: file.mimetype,
          isMain: false,
          uploadedByUserId: req.user!.id,
        },
      }),
    ),
  );

  res.status(201).json({ success: true, images: created, count: created.length });
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

  // Clean up physical file
  try {
    if (/^https?:\/\//.test(image.fileUrl) && !image.fileUrl.includes('/uploads/')) {
      uploadStorage.cleanupUpload(image.fileUrl);
    } else {
      const url = new URL(image.fileUrl);
      const filepath = url.pathname.replace(/^\/uploads\//, '');
      const { join } = await import('path');
      uploadStorage.cleanupUpload(join(uploadsRoot, filepath));
    }
  } catch { /* best-effort cleanup */ }

  res.json({ success: true, message: 'Imagen eliminada' });
};
