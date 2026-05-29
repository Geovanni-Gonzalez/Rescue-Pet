import { Badge } from './ui/badge';

export type PetStatus = 'QUARANTINE' | 'AVAILABLE' | 'TREATMENT' | 'ADOPTED' | 'DECEASED';

interface StatusBadgeProps {
  status: PetStatus;
}

const statusConfig: Record<PetStatus, { label: string; className: string }> = {
  AVAILABLE: { label: 'Disponible', className: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200' },
  QUARANTINE: { label: 'En Cuarentena', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200' },
  TREATMENT: { label: 'En Tratamiento', className: 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200' },
  ADOPTED: { label: 'Adoptado', className: 'bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200' },
  DECEASED: { label: 'Fallecido', className: 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: '' };
  
  return (
    <Badge variant="outline" className={`font-medium ${config.className}`}>
      {config.label}
    </Badge>
  );
}
