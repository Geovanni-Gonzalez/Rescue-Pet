import { useRef, useState } from 'react';
import { Trash2, Upload, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { Button } from './ui/button';
import { apiClient, getApiErrorMessage } from '../lib/api';

interface GalleryImage {
  id: string;
  fileUrl: string;
  fileType: string;
  isMain: boolean;
}

interface GalleryManagerProps {
  animalId: string;
  images: GalleryImage[];
  canManage: boolean;
  onGalleryChange: (images: GalleryImage[]) => void;
}

export function GalleryManager({ animalId, images, canManage, onGalleryChange }: GalleryManagerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allImages = images;
  const currentImage = allImages[currentIndex];

  const prev = () => setCurrentIndex((i) => (i > 0 ? i - 1 : allImages.length - 1));
  const next = () => setCurrentIndex((i) => (i < allImages.length - 1 ? i + 1 : 0));

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
    const invalid = files.filter((f) => !ALLOWED.includes(f.type));
    const valid = files.filter((f) => ALLOWED.includes(f.type));

    if (invalid.length > 0) {
      setUploadError(`${invalid.length} archivo(s) ignorados: solo se aceptan JPG, PNG y WEBP.`);
    }

    if (valid.length === 0) return;

    const oversized = valid.filter((f) => f.size > 5 * 1024 * 1024);
    if (oversized.length > 0) {
      setUploadError(`${oversized.length} archivo(s) superan el límite de 5 MB.`);
      return;
    }

    setUploadError('');
    setIsUploading(true);
    setUploadProgress(0);

    const form = new FormData();
    valid.forEach((f) => form.append('images', f));

    try {
      const res = await apiClient.post<{ images: GalleryImage[] }>(
        `/animals/${animalId}/gallery`,
        form,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
          },
        },
      );
      onGalleryChange([...allImages, ...res.data.images]);
      setCurrentIndex(allImages.length); // Jump to first new image
    } catch (err) {
      setUploadError(getApiErrorMessage(err, 'No se pudieron subir las imágenes.'));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (imageId: string) => {
    try {
      await apiClient.delete(`/animals/${animalId}/gallery/${imageId}`);
      const updated = allImages.filter((img) => img.id !== imageId);
      onGalleryChange(updated);
      setCurrentIndex((i) => Math.min(i, Math.max(updated.length - 1, 0)));
    } catch (err) {
      setUploadError(getApiErrorMessage(err, 'No se pudo eliminar la imagen.'));
    }
  };

  if (allImages.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center h-48 bg-muted rounded-lg border border-dashed border-border">
          <div className="text-center text-muted-foreground">
            <ImageOff className="w-10 h-10 mx-auto mb-2" />
            <p className="text-sm">Sin imágenes en galería</p>
          </div>
        </div>
        {canManage && (
          <UploadSection
            fileInputRef={fileInputRef}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            uploadError={uploadError}
            onFileSelect={handleFileSelect}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Carousel */}
      <div className="relative rounded-lg overflow-hidden bg-muted border border-border" style={{ height: '240px' }}>
        <img
          src={currentImage?.fileUrl}
          alt={`Foto ${currentIndex + 1}`}
          className="w-full h-full object-contain"
          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
        />

        {/* Navigation */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              aria-label="Foto siguiente"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Counter + main badge */}
        <div className="absolute bottom-2 left-2 flex items-center gap-2">
          <span className="bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
            {currentIndex + 1} / {allImages.length}
          </span>
          {currentImage?.isMain && (
            <span className="bg-rescue-600 text-white text-xs px-2 py-0.5 rounded-full">
              Principal
            </span>
          )}
        </div>

        {/* Delete button for non-main images */}
        {canManage && currentImage && !currentImage.isMain && (
          <button
            onClick={() => handleDelete(currentImage.id)}
            aria-label="Eliminar imagen"
            className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            title="Eliminar imagen"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Thumbnails */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allImages.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Ver foto ${idx + 1}`}
              aria-current={idx === currentIndex}
              className={`flex-shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                idx === currentIndex ? 'border-rescue-500' : 'border-transparent hover:border-border'
              }`}
            >
              <img src={img.fileUrl} alt={`Miniatura ${idx + 1}`} loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Upload section */}
      {canManage && (
        <UploadSection
          fileInputRef={fileInputRef}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          uploadError={uploadError}
          onFileSelect={handleFileSelect}
        />
      )}
    </div>
  );
}

interface UploadSectionProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isUploading: boolean;
  uploadProgress: number;
  uploadError: string;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function UploadSection({ fileInputRef, isUploading, uploadProgress, uploadError, onFileSelect }: UploadSectionProps) {
  return (
    <div className="space-y-2">
      {uploadError && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          {uploadError}
        </p>
      )}
      {isUploading && (
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="bg-rescue-600 h-1.5 rounded-full transition-all"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={onFileSelect}
        capture="environment"
      />
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-4 h-4" />
        {isUploading ? `Subiendo... ${uploadProgress}%` : 'Agregar fotos'}
      </Button>
      <p className="text-xs text-muted-foreground text-center">JPG, PNG o WEBP · máx. 5 MB por foto</p>
    </div>
  );
}
