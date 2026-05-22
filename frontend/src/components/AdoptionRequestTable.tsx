import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Eye } from 'lucide-react';

export type AdoptionRequestStatusType = 'RECEIVED' | 'INTERVIEW' | 'VISIT' | 'APPROVED' | 'REJECTED';

interface AdoptionRequest {
  id: string;
  status: AdoptionRequestStatusType;
  createdAt: string;
  rejectionReason?: string;
  pet: {
    id: string;
    name: string;
    species: string;
    breed?: string;
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

const statusConfig: Record<AdoptionRequestStatusType, { label: string; className: string }> = {
  RECEIVED: { label: 'Recibida', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  INTERVIEW: { label: 'Entrevista', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  VISIT: { label: 'Visita', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  APPROVED: { label: 'Aprobada', className: 'bg-green-100 text-green-800 border-green-200' },
  REJECTED: { label: 'Rechazada', className: 'bg-red-100 text-red-800 border-red-200' },
};

export function AdoptionRequestTable({ requests, onViewDetail, isAdmin = false }: AdoptionRequestTableProps) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No hay solicitudes de adopción</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-700">Mascota</th>
            {isAdmin && <th className="text-left py-3 px-4 font-medium text-gray-700">Adoptante</th>}
            <th className="text-left py-3 px-4 font-medium text-gray-700">Estado</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Fecha</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  {request.pet.mainPhotoUrl && (
                    <img
                      src={request.pet.mainPhotoUrl}
                      alt={request.pet.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{request.pet.name}</p>
                    <p className="text-sm text-gray-500">{request.pet.species} {request.pet.breed || ''}</p>
                  </div>
                </div>
              </td>
              {isAdmin && request.adopter && (
                <td className="py-3 px-4">
                  <div>
                    <p className="font-medium text-gray-900">{request.adopter.fullName}</p>
                    <p className="text-sm text-gray-500">{request.adopter.email}</p>
                  </div>
                </td>
              )}
              <td className="py-3 px-4">
                <Badge variant="outline" className={statusConfig[request.status].className}>
                  {statusConfig[request.status].label}
                </Badge>
                {request.status === 'REJECTED' && request.rejectionReason && (
                  <p className="text-xs text-red-600 mt-1 max-w-xs truncate">{request.rejectionReason}</p>
                )}
              </td>
              <td className="py-3 px-4 text-sm text-gray-600">
                {new Date(request.createdAt).toLocaleDateString('es-ES')}
              </td>
              <td className="py-3 px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewDetail(request.id)}
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
