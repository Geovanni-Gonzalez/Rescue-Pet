import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingState } from '../components/LoadingState';
import { AdoptionRequestTable } from '../components/AdoptionRequestTable';
import { Button } from '../components/ui/button';
import type { AdoptionRequestStatusType } from '../components/AdoptionRequestTable';
import { apiClient } from '../lib/api';
import { getApiErrorMessage } from '../lib/api';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  mainPhotoUrl?: string;
  status: string;
}

interface Adopter {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
}

interface AdoptionRequest {
  id: string;
  status: AdoptionRequestStatusType;
  rejectionReason?: string;
  createdAt: string;
  pet: Pet;
  adopter: Adopter;
}

export function AdminAdoptionRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<AdoptionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdoptionRequestStatusType | 'ALL'>('ALL');

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const query = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
        const res = await apiClient.get(`/adoption-applications${query}`);
        setRequests(res.data.applications);
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'No se pudieron cargar las solicitudes'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchRequests();
  }, [statusFilter]);

  const handleViewDetail = (id: string) => {
    navigate(`/admin/adoption-requests/${id}`);
  };

  if (isLoading) return <LoadingState />;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Solicitudes de Adopción</h1>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={statusFilter === 'ALL' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('ALL')}
        >
          Todas
        </Button>
        <Button
          variant={statusFilter === 'RECEIVED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('RECEIVED')}
        >
          Recibidas
        </Button>
        <Button
          variant={statusFilter === 'INTERVIEW' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('INTERVIEW')}
        >
          Entrevista
        </Button>
        <Button
          variant={statusFilter === 'VISIT' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('VISIT')}
        >
          Visita
        </Button>
        <Button
          variant={statusFilter === 'APPROVED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('APPROVED')}
        >
          Aprobadas
        </Button>
        <Button
          variant={statusFilter === 'REJECTED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('REJECTED')}
        >
          Rechazadas
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <AdoptionRequestTable
          requests={requests}
          onViewDetail={handleViewDetail}
          isAdmin={true}
        />
      </div>
    </div>
  );
}
