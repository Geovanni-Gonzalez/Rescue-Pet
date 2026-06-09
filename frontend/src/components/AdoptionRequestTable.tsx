import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Eye } from 'lucide-react';
import { ADOPTION_STATUS, roleClasses, type AdoptionRequestStatusType } from '../design/status';

export type { AdoptionRequestStatusType };

interface AdoptionRequest {
  id: string;
  status: AdoptionRequestStatusType;
  createdAt: string;
  rejectionReason?: string;
  animal: {
    id: string;
    name: string;
    species: string;
    estimatedBreed?: string;
    mainPhotoUrl?: string;
  };
  adopter?: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
  };
}

interface AdoptionRequestTableProps {
  requests: AdoptionRequest[];
  onViewDetail: (id: string) => void;
  isAdmin?: boolean;
}

export function AdoptionRequestTable({ requests, onViewDetail, isAdmin = false }: AdoptionRequestTableProps) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-sm font-medium text-foreground">Sin solicitudes</p>
        <p className="text-xs text-muted-foreground mt-1">
          {isAdmin
            ? 'Las solicitudes de los adoptantes aparecerán aquí.'
            : 'Cuando solicites adoptar una mascota, podrás seguir el proceso aquí.'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 font-medium text-foreground">Mascota</th>
            {isAdmin && <th className="text-left py-3 px-4 font-medium text-foreground">Adoptante</th>}
            <th className="text-left py-3 px-4 font-medium text-foreground">Estado</th>
            <th className="text-left py-3 px-4 font-medium text-foreground">Fecha</th>
            <th className="text-left py-3 px-4 font-medium text-foreground">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id} className="border-b border-border hover:bg-muted">
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  {request.animal.mainPhotoUrl && (
                    <img
                      src={request.animal.mainPhotoUrl}
                      alt={request.animal.name}
                      loading="lazy"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="font-medium text-foreground">{request.animal.name}</p>
                    <p className="text-sm text-muted-foreground">{request.animal.species} {request.animal.estimatedBreed || ''}</p>
                  </div>
                </div>
              </td>
              {isAdmin && request.adopter && (
                <td className="py-3 px-4">
                  <div>
                    <p className="font-medium text-foreground">{request.adopter.fullName}</p>
                    <p className="text-sm text-muted-foreground">{request.adopter.email}</p>
                  </div>
                </td>
              )}
              <td className="py-3 px-4">
                <Badge variant="outline" className={roleClasses[ADOPTION_STATUS[request.status].role]}>
                  {ADOPTION_STATUS[request.status].label}
                </Badge>
                {request.status === 'REJECTED' && request.rejectionReason && (
                  <p className="text-xs text-status-danger-fg mt-1 max-w-xs truncate">{request.rejectionReason}</p>
                )}
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {new Date(request.createdAt).toLocaleDateString('es-CR')}
              </td>
              <td className="py-3 px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewDetail(request.id)}
                  aria-label={`Ver detalle de la solicitud de ${request.animal.name}`}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
