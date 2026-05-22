import React from 'react';
import { Input } from './ui/input';
import { Search } from 'lucide-react';

interface PetFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter?: string;
  onStatusChange?: (status: string) => void;
  showStatusFilter?: boolean;
}

export function PetFilters({ searchTerm, onSearchChange, statusFilter, onStatusChange, showStatusFilter = false }: PetFiltersProps) {
  const statuses: { value: string, label: string }[] = [
    { value: 'ALL', label: 'Todos los estados' },
    { value: 'QUARANTINE', label: 'En Cuarentena' },
    { value: 'AVAILABLE', label: 'Disponibles' },
    { value: 'TREATMENT', label: 'En Tratamiento' },
    { value: 'ADOPTED', label: 'Adoptados' },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input 
          placeholder="Buscar mascota por nombre o raza..." 
          className="pl-10"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      
      {showStatusFilter && onStatusChange && (
        <select 
          className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={statusFilter || 'ALL'}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          {statuses.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}
