import { Input } from './ui/input';
import { Search } from 'lucide-react';
import { PET_SIZE, PET_STATUS } from '../design/status';

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

const SELECT_CLASS = 'h-10 px-3 py-2 rounded-md border border-input bg-background text-sm shadow-sm ring-offset-background transition-[border-color,box-shadow] duration-150 ease-out-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

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
    { value: 'QUARANTINE', label: PET_STATUS.QUARANTINE.label },
    { value: 'AVAILABLE', label: PET_STATUS.AVAILABLE.label },
    { value: 'TREATMENT', label: PET_STATUS.TREATMENT.label },
    { value: 'ADOPTED', label: PET_STATUS.ADOPTED.label },
  ];

  const patch = (key: keyof CatalogFilters, value: string) => {
    if (onCatalogFilterChange && catalogFilters) {
      onCatalogFilterChange({ ...catalogFilters, [key]: value });
    }
  };

  return (
    <div className="space-y-3 mb-6 rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Buscar por nombre, especie o raza estimada"
            className="pl-10"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {showStatusFilter && onStatusChange && (
          <select className={`${SELECT_CLASS} sm:w-56`} value={statusFilter || 'ALL'} onChange={(e) => onStatusChange(e.target.value)}>
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        )}
      </div>

      {showCatalogFilters && catalogFilters && onCatalogFilterChange && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
            <option value="SMALL">{PET_SIZE.SMALL}</option>
            <option value="MEDIUM">{PET_SIZE.MEDIUM}</option>
            <option value="LARGE">{PET_SIZE.LARGE}</option>
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
