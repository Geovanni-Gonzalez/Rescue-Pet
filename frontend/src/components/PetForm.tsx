import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { FormField } from './FormField';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiErrorMessage } from '../lib/api';

export interface PetFormData {
  id: string;
  name: string;
  species: string;
  breed?: string;
  estimatedAge?: number;
  size?: string;
  mainPhotoUrl?: string;
  rescueLocationText?: string;
  energyLevel?: string;
  spaceNeed?: string;
}

interface PetFormProps {
  initialData?: PetFormData;
  isEdit?: boolean;
}

export function PetForm({ initialData, isEdit = false }: PetFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    species: initialData?.species || '',
    breed: initialData?.breed || '',
    estimatedAge: initialData?.estimatedAge || 0,
    size: initialData?.size || '',
    mainPhotoUrl: initialData?.mainPhotoUrl || '',
    rescueLocationText: initialData?.rescueLocationText || '',
    energyLevel: initialData?.energyLevel || '',
    spaceNeed: initialData?.spaceNeed || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isEdit && initialData) {
        await axios.patch(`http://localhost:3000/pets/${initialData.id}`, formData);
        navigate(`/pets/${initialData.id}`);
      } else {
        const res = await axios.post('http://localhost:3000/pets', formData);
        navigate(`/pets/${res.data.pet.id}`);
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Error al guardar la mascota'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Nombre *" name="name" value={formData.name} onChange={handleChange} required />
        <FormField label="Especie *" name="species" value={formData.species} onChange={handleChange} placeholder="Ej. Perro, Gato" required />
        <FormField label="Raza" name="breed" value={formData.breed} onChange={handleChange} />
        <FormField label="Edad Estimada (meses)" name="estimatedAge" type="number" min={0} value={formData.estimatedAge} onChange={handleChange} />
        <FormField label="Tamaño" name="size" value={formData.size} onChange={handleChange} placeholder="Ej. Pequeño, Mediano" />
        <FormField label="Fotografía principal (URL) *" name="mainPhotoUrl" value={formData.mainPhotoUrl} onChange={handleChange} placeholder="https://..." required />
        <FormField label="Localización de rescate" name="rescueLocationText" value={formData.rescueLocationText} onChange={handleChange} placeholder="Dirección o referencia" />
        
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Nivel de Energía</label>
          <select name="energyLevel" value={formData.energyLevel} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
            <option value="">Seleccionar...</option>
            <option value="LOW">Bajo</option>
            <option value="MEDIUM">Medio</option>
            <option value="HIGH">Alto</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Necesidad de Espacio</label>
          <select name="spaceNeed" value={formData.spaceNeed} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
            <option value="">Seleccionar...</option>
            <option value="SMALL">Pequeño</option>
            <option value="MEDIUM">Mediano</option>
            <option value="LARGE">Grande</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
        <Button type="submit" disabled={isLoading}>{isLoading ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear Mascota')}</Button>
      </div>
    </form>
  );
}
