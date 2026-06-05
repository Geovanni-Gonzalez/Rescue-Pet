import { useState, useEffect } from 'react';
import { PetCard } from '../components/PetCard';
import { PetFilters } from '../components/PetFilters';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Plus } from 'lucide-react';
import { apiClient } from '../lib/api';
import type { PetStatus } from '../components/StatusBadge';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  estimatedAge?: number;
  status: PetStatus;
  mainPhotoUrl?: string;
}

export function Pets() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const fetchPets = async () => {
      try {
        const query = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
        const res = await apiClient.get(`/animals${query}`);
        setPets(res.data.animals || []);
      } catch (err) {
        console.error('Error al cargar mascotas', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPets();
  }, [statusFilter]);

  const filteredPets = pets.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.species.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.breed && p.breed.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const canManagePets = role === 'ADMIN' || role === 'VOLUNTEER';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {role === 'ADOPTER' ? 'Mascotas Disponibles' : 'Gestión de Mascotas'}
          </h1>
          <p className="text-gray-500">
            {role === 'ADOPTER' 
              ? 'Encuentra a tu nuevo mejor amigo.' 
              : 'Administra el catálogo y estado de los animales en el refugio.'}
          </p>
        </div>
        
        {canManagePets && (
          <Button onClick={() => navigate('/admin/pets/new')} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Registrar Mascota
          </Button>
        )}
      </div>

      <PetFilters 
        searchTerm={searchTerm} 
        onSearchChange={setSearchTerm} 
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        showStatusFilter={role !== 'ADOPTER'} // Adoptantes no ven el filtro de estado porque el backend fuerza AVAILABLE
      />

      {isLoading ? (
        <LoadingState message="Cargando catálogo..." />
      ) : filteredPets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 stagger-grid">
          {filteredPets.map(pet => (
            <PetCard
              key={pet.id}
              id={pet.id}
              name={pet.name}
              species={pet.species}
              breed={pet.breed || 'Desconocida'}
              age={pet.estimatedAge || 0}
              status={pet.status}
              photoUrl={pet.mainPhotoUrl}
              onAction={(id) => navigate(`/pets/${id}`)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={searchTerm ? 'Sin resultados' : 'Sin mascotas registradas'}
          description={
            searchTerm
              ? 'Ninguna mascota coincide con tu búsqueda.'
              : canManagePets
                ? 'Registra la primera mascota para comenzar.'
                : 'No hay mascotas en el sistema actualmente.'
          }
          action={
            canManagePets && !searchTerm ? (
              <Button size="sm" onClick={() => navigate('/admin/pets/new')}>
                <Plus className="w-4 h-4 mr-1" /> Registrar mascota
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
