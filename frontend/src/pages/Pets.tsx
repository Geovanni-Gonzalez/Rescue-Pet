import { useState, useEffect } from 'react';
import { PetCard } from '../components/PetCard';
import { PetFilters } from '../components/PetFilters';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { Alert } from '../components/ui/alert';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { apiClient, getApiErrorMessage } from '../lib/api';
import type { PetStatus } from '../components/StatusBadge';

interface Pet {
  id: string;
  name: string;
  species: string;
  estimatedBreed?: string;
  estimatedAge?: number;
  status: PetStatus;
  mainPhotoUrl?: string;
}

export function Pets() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deleteTarget, setDeleteTarget] = useState<Pet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchPets = async () => {
      try {
        setError('');
        const query = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
        const res = await apiClient.get(`/animals${query}`);
        setPets(res.data.animals || []);
      } catch (err) {
        console.error('Error al cargar mascotas', err);
        setError(getApiErrorMessage(err, 'No se pudo cargar el catálogo de mascotas.'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchPets();
  }, [statusFilter]);

  const filteredPets = pets.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.species.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.estimatedBreed && p.estimatedBreed.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const canManagePets = role === 'ADMIN' || role === 'VOLUNTEER';
  const canDeletePets = role === 'ADMIN';

  const handleDeletePet = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setError('');
    try {
      await apiClient.delete(`/animals/${deleteTarget.id}`);
      setPets((current) => current.filter((pet) => pet.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo eliminar la mascota.'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {role === 'ADOPTER' ? 'Mascotas Disponibles' : 'Gestión de Mascotas'}
          </h1>
          <p className="page-description">
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

      {error && (
        <Alert variant="danger">{error}</Alert>
      )}

      {isLoading ? (
        <LoadingState message="Cargando catálogo..." />
      ) : filteredPets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5 stagger-grid">
          {filteredPets.map(pet => (
            <div key={pet.id} className="relative">
              <PetCard
                id={pet.id}
                name={pet.name}
                species={pet.species}
                breed={pet.estimatedBreed || 'Desconocida'}
                age={pet.estimatedAge || 0}
                status={pet.status}
                photoUrl={pet.mainPhotoUrl}
                onAction={(id) => navigate(`/pets/${id}`)}
              />
              {canDeletePets && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute left-2.5 top-2.5 z-10 h-8 w-8 shadow-sm"
                  onClick={() => setDeleteTarget(pet)}
                  title={`Eliminar ${pet.name}`}
                  aria-label={`Eliminar ${pet.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTarget(null);
        }}
        title="Eliminar mascota"
        description={`Se eliminará ${deleteTarget?.name ?? 'esta mascota'} del catálogo junto con su historial, galería, solicitudes y documentos asociados. Esta acción no se puede deshacer.`}
        confirmText={isDeleting ? 'Eliminando...' : 'Eliminar'}
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={handleDeletePet}
      />
    </div>
  );
}
