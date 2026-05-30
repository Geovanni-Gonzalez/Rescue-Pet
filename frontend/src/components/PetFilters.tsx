import { Input } from './ui/input';
import { Search } from 'lucide-react';

export interface CatalogFilters {
  species: string;
  size: string;
  minAge: string;
  maxAge: string;
}

interface PetFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter?: string;
  onStatusChange?: (status: string) => void;
  showStatusFilter?: boolean;
  // Catalog-mode filters (server-side)
  catalogFilters?: CatalogFilters;
  onCatalogFilterChange?: (filters: CatalogFilters) => void;
  showCatalogFilters?: boolean;
}

const SELECT_CLASS = 'h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function PetFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  showStatusFilter = false,
  catalogFilters,
  onCatalogFilterChange,
  showCatalogFilters = false,
}: PetFiltersProps) {
  const statuses = [
    { value: 'ALL', label: 'Todos los estados' },
    { value: 'QUARANTINE', label: 'En Cuarentena' },
    { value: 'AVAILABLE', label: 'Disponibles' },
    { value: 'TREATMENT', label: 'En Tratamiento' },
    { value: 'ADOPTED', label: 'Adoptados' },
  ];

  const patch = (key: keyof CatalogFilters, value: string) => {
    if (onCatalogFilterChange && catalogFilters) {
      onCatalogFilterChange({ ...catalogFilters, [key]: value });
    }
  };

  return (
    <div className="space-y-3 mb-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Buscar por nombre o raza..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {showStatusFilter && onStatusChange && (
          <select className={SELECT_CLASS} value={statusFilter || 'ALL'} onChange={(e) => onStatusChange(e.target.value)}>
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        )}
      </div>

      {showCatalogFilters && catalogFilters && onCatalogFilterChange && (
        <div className="flex flex-wrap gap-3">
          <select
            className={SELECT_CLASS}
            value={catalogFilters.species}
            onChange={(e) => patch('species', e.target.value)}
          >
            <option value="">Todas las especies</option>
            <option value="Perro">Perro</option>
            <option value="Gato">Gato</option>
            <option value="Conejo">Conejo</option>
            <option value="Ave">Ave</option>
            <option value="Otro">Otro</option>
          </select>

          <select
            className={SELECT_CLASS}
            value={catalogFilters.size}
            onChange={(e) => patch('size', e.target.value)}
          >
            <option value="">Todos los tamaños</option>
            <option value="SMALL">Pequeño</option>
            <option value="MEDIUM">Mediano</option>
            <option value="LARGE">Grande</option>
          </select>

          <select
            className={SELECT_CLASS}
            value={catalogFilters.minAge}
            onChange={(e) => patch('minAge', e.target.value)}
          >
            <option value="">Edad mínima</option>
            <option value="0">0+ meses</option>
            <option value="3">3+ meses</option>
            <option value="12">1+ año</option>
            <option value="36">3+ años</option>
            <option value="72">6+ años</option>
          </select>

          <select
            className={SELECT_CLASS}
            value={catalogFilters.maxAge}
            onChange={(e) => patch('maxAge', e.target.value)}
          >
            <option value="">Edad máxima</option>
            <option value="3">Hasta 3 meses</option>
            <option value="12">Hasta 1 año</option>
            <option value="36">Hasta 3 años</option>
            <option value="72">Hasta 6 años</option>
            <option value="144">Hasta 12 años</option>
          </select>
        </div>
      )}
    </div>
  );
}
