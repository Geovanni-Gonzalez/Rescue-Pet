import path from 'path';

export const uploadsRoot = process.env.VERCEL
  ? path.join('/tmp', 'rescue-pet-uploads')
  : path.join(__dirname, '../../uploads');
