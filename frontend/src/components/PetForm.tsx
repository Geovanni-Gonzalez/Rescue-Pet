import { useState, useRef, lazy, Suspense } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { FormField } from './FormField';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { apiClient, getApiErrorMessage } from '../lib/api';
import { Upload, MapPin } from 'lucide-react';

// Lazy-load map to avoid SSR issues and reduce initial bundle
const LocationPicker = lazy(() =>
  import('./LocationPicker').then((m) => ({ default: m.LocationPicker })),
);

export interface PetFormData {
  id: string;
  name: string;
  species: string;
  estimatedBreed?: string;
  estimatedAge?: number;
  size?: string;
  mainPhotoUrl?: string;
  rescueLocationText?: string;
  rescueLatitude?: number;
  rescueLongitude?: number;
  energyLevel?: string;
  spaceNeed?: string;
}

interface PetFormProps {
  initialData?: PetFormData;
  isEdit?: boolean;
}

export function PetForm({ initialData, isEdit = false }: PetFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name ?? '',
    species: initialData?.species ?? '',
    estimatedBreed: initialData?.estimatedBreed ?? '',
    estimatedAge: initialData?.estimatedAge ?? 0,
    size: initialData?.size ?? '',
    rescueLocationText: initialData?.rescueLocationText ?? '',
    energyLevel: initialData?.energyLevel ?? '',
    spaceNeed: initialData?.spaceNeed ?? '',
    rescueLatitude: initialData?.rescueLatitude,
    rescueLongitude: initialData?.rescueLongitude,
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(initialData?.mainPhotoUrl ?? '');
  const [showMap, setShowMap] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(file.type)) {
      setError('Formato no permitido. Usa JPG, PNG o WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen supera el límite de 5 MB.');
      return;
    }

    setError('');
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isEdit && !photoFile) {
      setError('La fotografía principal es obligatoria.');
      return;
    }

    setIsLoading(true);

    try {
      const form = new FormData();
      form.append('name', formData.name);
      form.append('species', formData.species);
      if (formData.estimatedBreed) form.append('estimatedBreed', formData.estimatedBreed);
      if (formData.estimatedAge) form.append('estimatedAge', String(formData.estimatedAge));
      if (formData.size) form.append('size', formData.size);
      if (formData.rescueLocationText) form.append('rescueLocationText', formData.rescueLocationText);
      if (formData.rescueLatitude !== undefined) form.append('rescueLatitude', String(formData.rescueLatitude));
      if (formData.rescueLongitude !== undefined) form.append('rescueLongitude', String(formData.rescueLongitude));
      if (formData.energyLevel) form.append('energyLevel', formData.energyLevel);
      if (formData.spaceNeed) form.append('spaceNeed', formData.spaceNeed);
      if (photoFile) form.append('mainPhoto', photoFile);

      if (isEdit && initialData) {
        await apiClient.patch(`/animals/${initialData.id}`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        navigate(`/pets/${initialData.id}`);
      } else {
        const res = await apiClient.post('/animals', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        navigate(`/pets/${res.data.animal.id}`);
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Error al guardar la mascota'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-w-2xl mx-auto bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">{error}</div>
      )}

      {/* Photo upload */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Fotografía principal {!isEdit && <span className="text-red-500">*</span>}
        </label>
        <div className="flex items-start gap-4">
          <div
            className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Vista previa" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center text-gray-400 p-2">
                <Upload className="w-6 h-6 mx-auto mb-1" />
                <p className="text-xs">Subir foto</p>
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2 pt-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
              capture="environment"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4" />
              {photoFile ? 'Cambiar foto' : isEdit ? 'Cambiar foto principal' : 'Seleccionar foto'}
            </Button>
            <p className="text-xs text-gray-400">JPG, PNG o WEBP · máx. 5 MB</p>
            {photoFile && (
              <p className="text-xs text-green-600">✓ {photoFile.name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Basic fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Nombre *"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <FormField
          label="Especie *"
          name="species"
          value={formData.species}
          onChange={handleChange}
          placeholder="Ej. Perro, Gato"
          required
        />
        <FormField
          label="Raza estimada"
          name="estimatedBreed"
          value={formData.estimatedBreed}
          onChange={handleChange}
        />
        <FormField
          label="Edad estimada (meses)"
          name="estimatedAge"
          type="number"
          min={0}
          value={formData.estimatedAge}
          onChange={handleChange}
        />
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Tamaño</label>
          <select
            name="size"
            value={formData.size}
            onChange={handleChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Seleccionar...</option>
            <option value="SMALL">Pequeño</option>
            <option value="MEDIUM">Mediano</option>
            <option value="LARGE">Grande</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Nivel de energía</label>
          <select
            name="energyLevel"
            value={formData.energyLevel}
            onChange={handleChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Seleccionar...</option>
            <option value="LOW">Bajo</option>
            <option value="MEDIUM">Medio</option>
            <option value="HIGH">Alto</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Necesidad de espacio</label>
          <select
            name="spaceNeed"
            value={formData.spaceNeed}
            onChange={handleChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Seleccionar...</option>
            <option value="SMALL">Pequeño</option>
            <option value="MEDIUM">Mediano</option>
            <option value="LARGE">Grande</option>
          </select>
        </div>
      </div>

      {/* Location */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            Localización de rescate
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowMap((v) => !v)}
            className="text-xs text-rescue-600"
          >
            {showMap ? 'Ocultar mapa' : 'Abrir mapa'}
          </Button>
        </div>

        <FormField
          label=""
          name="rescueLocationText"
          value={formData.rescueLocationText}
          onChange={handleChange}
          placeholder="Dirección o referencia de texto (opcional)"
        />

        {showMap && (
          <Suspense fallback={<div className="h-64 bg-gray-100 rounded animate-pulse" />}>
            <LocationPicker
              latitude={formData.rescueLatitude}
              longitude={formData.rescueLongitude}
              onLocationChange={(lat, lng) =>
                setFormData((f) => ({ ...f, rescueLatitude: lat, rescueLongitude: lng }))
              }
            />
          </Suspense>
        )}

        {formData.rescueLatitude !== undefined && formData.rescueLongitude !== undefined && (
          <p className="text-xs text-gray-500">
            Coordenadas: {formData.rescueLatitude}, {formData.rescueLongitude}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : isEdit ? 'Actualizar mascota' : 'Registrar mascota'}
        </Button>
      </div>
    </form>
  );
}
