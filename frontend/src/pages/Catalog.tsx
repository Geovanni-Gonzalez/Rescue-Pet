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
import { Alert } from '../components/ui/alert';
import { Sparkles, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
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
const PAGE_SIZE = 20;

export function Catalog() {
  const navigate = useNavigate();

  const [catalog, setCatalog] = useState<CatalogPet[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [catalogFilters, setCatalogFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [sortedByCompatibility, setSortedByCompatibility] = useState(false);

  const fetchCatalog = useCallback(async (filters: CatalogFilters, p: number) => {
    setIsLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { page: String(p), limit: String(PAGE_SIZE) };
      if (filters.species) params['species'] = filters.species;
      if (filters.size) params['size'] = filters.size;
      if (filters.minAge) params['minAge'] = filters.minAge;
      if (filters.maxAge) params['maxAge'] = filters.maxAge;

      const res = await apiClient.get('/catalog/animals', { params });
      setCatalog(res.data.animals ?? []);
      setTotal(res.data.total ?? 0);
      setSortedByCompatibility(res.data.sortedByCompatibility ?? false);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error al cargar el catálogo'));
      setCatalog([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog(catalogFilters, page);
  }, [catalogFilters, page, fetchCatalog]);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      await apiClient.post('/adopters/me/compatibility/recalculate');
      await fetchCatalog(catalogFilters, page);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Completa el test de afinidad primero.'));
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleFilterChange = (f: CatalogFilters) => {
    setCatalogFilters(f);
    setPage(1);
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

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Catálogo Inteligente</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Descubre a tu compañero ideal. Completa el test para orden por afinidad.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
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
            size="sm"
          >
            Hacer Test
          </Button>
        </div>
      </div>

      {/* Onboarding banner or sort indicator */}
      {!isLoading && !sortedByCompatibility && total > 0 && (
        <div className="flex items-start gap-4 p-4 mb-4 rounded-xl bg-warm-50 border border-warm-100">
          <div className="w-9 h-9 rounded-lg bg-warm-100 text-warm-700 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Encuentra tu compañero ideal</p>
            <p className="text-xs text-muted-foreground mt-0.5">Completa el test de afinidad y ordenaremos las mascotas por compatibilidad contigo.</p>
          </div>
          <Button
            onClick={() => navigate('/compatibility-test')}
            size="sm"
            className="bg-warm-600 text-white hover:bg-warm-700 flex-shrink-0"
          >
            Hacer test
          </Button>
        </div>
      )}
      {!isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          {sortedByCompatibility && <Sparkles className="w-3.5 h-3.5 text-rescue-500" />}
          <span>{sortedByCompatibility ? 'Ordenado por afinidad' : `${total} ${total === 1 ? 'mascota' : 'mascotas'}`}</span>
          {sortedByCompatibility && (
            <span className="ml-auto">{total} {total === 1 ? 'mascota' : 'mascotas'}{hasActiveFilters ? ' filtradas' : ''}</span>
          )}
        </div>
      )}

      {error && (
        <Alert variant="danger" className="mb-4">{error}</Alert>
      )}

      {/* Filters */}
      <PetFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        showStatusFilter={false}
        showCatalogFilters
        catalogFilters={catalogFilters}
        onCatalogFilterChange={handleFilterChange}
      />

      {/* Reset filters */}
      {hasActiveFilters && (
        <button
          type="button"
          className="text-xs text-rescue-600 hover:underline mb-2"
          onClick={() => handleFilterChange(EMPTY_FILTERS)}
        >
          Limpiar filtros
        </button>
      )}

      {/* Catalog grid */}
      {isLoading ? (
        <LoadingState message="Analizando afinidad..." />
      ) : filteredCatalog.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5 stagger-grid">
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
          title={searchTerm || hasActiveFilters ? 'Sin resultados' : 'No hay mascotas disponibles'}
          description={
            searchTerm || hasActiveFilters
              ? 'Ninguna mascota coincide con los filtros.'
              : 'Actualmente no hay mascotas listas para adopción.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={() => handleFilterChange(EMPTY_FILTERS)}>
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
