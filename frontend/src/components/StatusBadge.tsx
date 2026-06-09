import { Badge } from './ui/badge';
import { PET_STATUS, roleClasses, type PetStatus } from '../design/status';

export type { PetStatus };

interface StatusBadgeProps {
  status: PetStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = PET_STATUS[status];

  if (!config) {
    return <Badge variant="outline" className="font-medium">{status}</Badge>;
  }

  return (
    <Badge variant="outline" className={`font-medium ${roleClasses[config.role]}`}>
      {config.label}
    </Badge>
  );
}
