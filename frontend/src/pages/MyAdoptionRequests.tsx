import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { LoadingState } from '../components/LoadingState';
import { AdoptionRequestTable } from '../components/AdoptionRequestTable';
import { Button } from '../components/ui/button';
import { Alert } from '../components/ui/alert';
import type { AdoptionRequestStatusType } from '../components/AdoptionRequestTable';
import { apiClient, getApiErrorMessage } from '../lib/api';

interface Animal {
  id: string;
  name: string;
  species: string;
  estimatedBreed?: string;
  mainPhotoUrl?: string;
  status: string;
}

interface AdoptionRequest {
  id: string;
  status: AdoptionRequestStatusType;
  rejectionReason?: string;
  createdAt: string;
  animal: Animal;
}

export function MyAdoptionRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<AdoptionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdoptionRequestStatusType | 'ALL'>('ALL');
  // CU-17 paso 2: el tablero publica la disponibilidad de horarios de entrevista
  const [availableSlotCount, setAvailableSlotCount] = useState(0);
  const [pendingInterviewRequestId, setPendingInterviewRequestId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const query = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
        const res = await apiClient.get(`/adoption-applications${query}`);
        setRequests(res.data.applications);

        // Si hay una solicitud pendiente de agendar entrevista, anunciar los
        // horarios disponibles directamente en el tablero.
        const pending = (res.data.applications as (AdoptionRequest & { interviewSlot?: unknown })[]).find(
          (r) => ['RECEIVED', 'INTERVIEW'].includes(r.status) && !r.interviewSlot
        );
        setPendingInterviewRequestId(pending?.id ?? null);
        if (pending) {
          try {
            const slotsRes = await apiClient.get('/interview-slots/available');
            setAvailableSlotCount((slotsRes.data.slots ?? []).length);
          } catch {
            setAvailableSlotCount(0);
          }
        } else {
          setAvailableSlotCount(0);
        }
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'No se pudieron cargar las solicitudes'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchRequests();
  }, [statusFilter]);

  const handleViewDetail = (id: string) => {
    navigate(`/adoption/my-requests/${id}`);
  };

  if (isLoading) return <LoadingState />;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-5">Mis Solicitudes de Adopción</h1>

      {/* CU-17 paso 2: horarios disponibles publicados en el tablero */}
      {pendingInterviewRequestId && availableSlotCount > 0 && (
        <Alert variant="success" className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Hay {availableSlotCount} {availableSlotCount === 1 ? 'horario disponible' : 'horarios disponibles'} para
            agendar tu entrevista de adopción.
          </span>
          <Button size="sm" onClick={() => handleViewDetail(pendingInterviewRequestId)}>
            Agendar ahora
          </Button>
        </Alert>
      )}

      <div className="flex gap-2 flex-wrap mb-4">
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

      <div className="bg-card rounded-xl border border-border shadow-sm">
        <AdoptionRequestTable
          requests={requests}
          onViewDetail={handleViewDetail}
          isAdmin={false}
        />
      </div>
    </div>
  );
}
