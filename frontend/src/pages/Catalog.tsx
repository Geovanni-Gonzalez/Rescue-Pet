import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PetCard } from '../components/PetCard';
import { PetFilters } from '../components/PetFilters';
import type { CatalogFilters } from '../components/PetFilters';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { CompatibilityScoreBadge } from '../components/CompatibilityScoreBadge';
import { CompatibilityExplanation } from '../components/CompatibilityExplanation';
import { Button } from '../components/ui/button';
import { Sparkles, Clock, RefreshCw } from 'lucide-react';
import { apiClient, getApiErrorMessage } from '../lib/api';

interface CatalogPet {
  id: string;
  name: string;
  species: string;
  estimatedBreed?: string;
  estimatedAge?: number;
  size?: string;
  status: 'QUARANTINE' | 'AVAILABLE' | 'TREATMENT' | 'ADOPTED' | 'DECEASED';
  mainPhotoUrl?: string;
  compatibilityScore: number | null;
  compatibilityExplanation: string | null;
}

const EMPTY_FILTERS: CatalogFilters = { species: '', size: '', minAge: '', maxAge: '' };

export function Catalog() {
  const navigate = useNavigate();

  const [catalog, setCatalog] = useState<CatalogPet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [catalogFilters, setCatalogFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [sortedByCompatibility, setSortedByCompatibility] = useState(false);

  const fetchCatalog = useCallback(async (filters: CatalogFilters) => {
    setIsLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (filters.species) params['species'] = filters.species;
      if (filters.size) params['size'] = filters.size;
      if (filters.minAge) params['minAge'] = filters.minAge;
      if (filters.maxAge) params['maxAge'] = filters.maxAge;

      const res = await apiClient.get('/catalog/animals', { params });
      setCatalog(res.data.animals ?? []);
      setSortedByCompatibility(res.data.sortedByCompatibility ?? false);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error al cargar el catálogo'));
      setCatalog([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog(catalogFilters);
  }, [catalogFilters, fetchCatalog]);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      await apiClient.post('/adopters/me/compatibility/recalculate');
      await fetchCatalog(catalogFilters);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Completa el test de afinidad primero.'));
    } finally {
      setIsRecalculating(false);
    }
  };

  const filteredCatalog = catalog.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.species.toLowerCase().includes(term) ||
      (p.estimatedBreed && p.estimatedBreed.toLowerCase().includes(term))
    );
  });

  const hasActiveFilters =
    catalogFilters.species || catalogFilters.size || catalogFilters.minAge || catalogFilters.maxAge;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-rescue-50 p-6 rounded-xl border border-rescue-100">
        <div>
          <h1 className="text-2xl font-bold text-rescue-900">Catálogo Inteligente</h1>
          <p className="text-rescue-700 text-sm">
            Descubre a tu compañero ideal. Completa el test para que ordenemos los candidatos por afinidad.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleRecalculate}
            variant="outline"
            size="sm"
            disabled={isRecalculating}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
            {isRecalculating ? 'Calculando...' : 'Recalcular'}
          </Button>
          <Button
            onClick={() => navigate('/compatibility-test')}
            className="bg-rescue-600 hover:bg-rescue-700"
          >
            Hacer / Actualizar Test
          </Button>
        </div>
      </div>

      {/* Sort indicator */}
      {!isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {sortedByCompatibility ? (
            <>
              <Sparkles className="w-4 h-4 text-rescue-500" />
              <span>Ordenado por tu afinidad personal</span>
            </>
          ) : (
            <>
              <Clock className="w-4 h-4" />
              <span>Ordenado por fecha de ingreso (completa el test para orden personalizado)</span>
            </>
          )}
          <span className="ml-auto text-gray-400">
            {filteredCatalog.length} {filteredCatalog.length === 1 ? 'mascota' : 'mascotas'}
            {hasActiveFilters ? ' filtradas' : ' disponibles'}
          </span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">{error}</div>
      )}

      {/* Filters */}
      <PetFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        showStatusFilter={false}
        showCatalogFilters
        catalogFilters={catalogFilters}
        onCatalogFilterChange={setCatalogFilters}
      />

      {/* Reset filters */}
      {hasActiveFilters && (
        <button
          type="button"
          className="text-xs text-rescue-600 hover:underline"
          onClick={() => setCatalogFilters(EMPTY_FILTERS)}
        >
          Limpiar filtros
        </button>
      )}

      {/* Catalog grid */}
      {isLoading ? (
        <LoadingState message="Analizando afinidad..." />
      ) : filteredCatalog.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCatalog.map((pet) => (
            <div key={pet.id} className="flex flex-col">
              <div className="relative group">
                <PetCard
                  id={pet.id}
                  name={pet.name}
                  species={pet.species}
                  breed={pet.estimatedBreed || 'Desconocida'}
                  age={pet.estimatedAge ?? 0}
                  status={pet.status}
                  photoUrl={pet.mainPhotoUrl}
                  onAction={(id) => navigate(`/pets/${id}`)}
                />
                {pet.compatibilityScore !== null && (
                  <div className="absolute top-3 left-3 z-10">
                    <CompatibilityScoreBadge score={pet.compatibilityScore} />
                  </div>
                )}
              </div>
              {pet.compatibilityExplanation && (
                <CompatibilityExplanation explanation={pet.compatibilityExplanation} />
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No hay mascotas disponibles"
          description={
            searchTerm || hasActiveFilters
              ? 'Ninguna mascota coincide con los filtros seleccionados.'
              : 'Actualmente no hay mascotas listas para adopción.'
          }
        />
      )}
    </div>
  );
}
