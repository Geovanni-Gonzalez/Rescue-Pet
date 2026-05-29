import { useState, useEffect } from 'react';
import { PetCard } from '../components/PetCard';
import { PetFilters } from '../components/PetFilters';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { CompatibilityScoreBadge } from '../components/CompatibilityScoreBadge';
import { CompatibilityExplanation } from '../components/CompatibilityExplanation';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { isNetworkError } from '../lib/api';

interface CatalogPet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  estimatedAge?: number;
  status: 'QUARANTINE' | 'AVAILABLE' | 'TREATMENT' | 'ADOPTED' | 'DECEASED';
  mainPhotoUrl?: string;
  compatibilityScore: number | null;
  compatibilityExplanation?: string;
}

export function Catalog() {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<CatalogPet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await axios.get('http://localhost:3000/matchmaking/catalog');
        setCatalog(res.data.catalog || []);
      } catch (err: unknown) {
        // Fallback: si el backend no está disponible, mostrar mensaje
        if (isNetworkError(err)) {
          setCatalog([]); // El usuario verá el EmptyState con CTA al test
        }
        console.warn('Backend no disponible — catálogo vacío.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  const filteredCatalog = catalog.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.species.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.breed && p.breed.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-rescue-50 p-6 rounded-xl border border-rescue-100">
        <div>
          <h1 className="text-2xl font-bold text-rescue-900">Catálogo Inteligente</h1>
          <p className="text-rescue-700">
            Descubre a tu compañero ideal. Si completas el test, ordenaremos a los candidatos por afinidad.
          </p>
        </div>
        <Button onClick={() => navigate('/compatibility-test')} variant="default" className="bg-rescue-600 hover:bg-rescue-700">
          Hacer / Actualizar Test
        </Button>
      </div>

      <PetFilters 
        searchTerm={searchTerm} 
        onSearchChange={setSearchTerm} 
        showStatusFilter={false}
      />

      {isLoading ? (
        <LoadingState message="Analizando afinidad..." />
      ) : filteredCatalog.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCatalog.map(pet => (
            <div key={pet.id} className="relative group">
              <PetCard
                id={pet.id}
                name={pet.name}
                species={pet.species}
                breed={pet.breed || 'Desconocida'}
                age={pet.estimatedAge || 0}
                status={pet.status}
                photoUrl={pet.mainPhotoUrl}
                onAction={(id) => navigate(`/pets/${id}`)}
              />
              {/* Overlay de afinidad */}
              {pet.compatibilityScore !== null && (
                <div className="absolute top-3 left-3 z-10">
                  <CompatibilityScoreBadge score={pet.compatibilityScore} />
                </div>
              )}
              {/* Explicación en card (opcional, visible solo en info extra o en hover si se desea, lo pondremos debajo) */}
              {pet.compatibilityExplanation && (
                <div className="mt-2">
                  <CompatibilityExplanation explanation={pet.compatibilityExplanation} />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState 
          title="No hay mascotas disponibles" 
          description={searchTerm ? "Ninguna mascota coincide con tu búsqueda." : "Actualmente no tenemos mascotas listas para adopción."} 
        />
      )}
    </div>
  );
}
