import { Badge } from './ui/badge';
import type { Role } from '../context/AuthContext';

interface RoleBadgeProps {
  role: Role;
}

const roleConfig: Record<Role, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  ADMIN: { label: 'Administrador', variant: 'destructive' },
  VETERINARIAN: { label: 'Veterinario', variant: 'default' },
  VOLUNTEER: { label: 'Voluntario', variant: 'secondary' },
  ADOPTER: { label: 'Adoptante', variant: 'outline' },
};

export function RoleBadge({ role }: RoleBadgeProps) {
  const config = roleConfig[role] || { label: role, variant: 'outline' };
  
  return (
    <Badge variant={config.variant} className="font-medium">
      {config.label}
    </Badge>
  );
}
