import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PetForm } from '../components/PetForm';
import { LoadingState } from '../components/LoadingState';
import { apiClient } from '../lib/api';
import type { PetFormData } from '../components/PetForm';

export function PetEdit() {
  const { id } = useParams();
  const [pet, setPet] = useState<PetFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPet = async () => {
      try {
        const res = await apiClient.get(`/animals/${id}`);
        setPet(res.data.animal);
      } catch {
        setError('No se pudo cargar la mascota');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPet();
  }, [id]);

  if (isLoading) return <LoadingState />;
  if (error || !pet) return <div className="p-6 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Editar Mascota: {pet.name}</h1>
      </div>
      <PetForm initialData={pet} isEdit={true} />
    </div>
  );
}
