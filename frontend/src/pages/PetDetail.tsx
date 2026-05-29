import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingState } from '../components/LoadingState';
import { StatusBadge, type PetStatus } from '../components/StatusBadge';
import { PetStatusSelector } from '../components/PetStatusSelector';
import { QRDisplay } from '../components/QRDisplay';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Button } from '../components/ui/button';
import { Edit, QrCode as QrIcon, Heart } from 'lucide-react';
import axios from 'axios';
import { getApiErrorMessage } from '../lib/api';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  estimatedAge?: number;
  size?: string;
  status: PetStatus;
  mainPhotoUrl?: string;
  qrCodeUrl?: string;
}

interface AdoptionRequestSummary {
  id: string;
  petId: string;
  status: 'RECEIVED' | 'INTERVIEW' | 'VISIT' | 'APPROVED' | 'REJECTED';
}

export function PetDetail() {
  const { id } = useParams();
  const { role } = useAuth();
  const navigate = useNavigate();
  const [pet, setPet] = useState<Pet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [existingRequest, setExistingRequest] = useState<AdoptionRequestSummary | null>(null);
  const [showAdoptionConfirm, setShowAdoptionConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchPet = async () => {
      try {
        const res = await axios.get(`http://localhost:3000/pets/${id}`);
        setPet(res.data.pet);
        setQrUrl(res.data.pet.qrCodeUrl || '');

        // Check for existing adoption request if user is ADOPTER
        if (role === 'ADOPTER') {
          try {
            const myRequestsRes = await axios.get('http://localhost:3000/adoption-requests/me');
            const existing = (myRequestsRes.data.requests as AdoptionRequestSummary[]).find(
              (request) => request.petId === id && ['RECEIVED', 'INTERVIEW', 'VISIT'].includes(request.status)
            );
            if (existing) {
              setExistingRequest(existing);
            }
          } catch {
            // Ignore error if no requests exist
          }
        }
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'No se pudo cargar la mascota'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchPet();
  }, [id, role]);

  const generateQR = async () => {
    try {
      const res = await axios.post(`http://localhost:3000/pets/${id}/generate-qr`);
      setQrUrl(res.data.qrCodeUrl);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdoptionRequest = async () => {
    setIsSubmitting(true);
    try {
      const res = await axios.post('http://localhost:3000/adoption-requests', { petId: id });
      setExistingRequest(res.data.request);
      setShowAdoptionConfirm(false);
    } catch (err: unknown) {
      if (axios.isAxiosError<{ existingRequestId?: string; error?: string }>(err) && err.response?.data?.existingRequestId) {
        setExistingRequest({ id: err.response.data.existingRequestId, petId: id || '', status: 'RECEIVED' });
      }
      setError(getApiErrorMessage(err, 'Error al crear la solicitud'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingState />;
  if (error || !pet) return <div className="p-6 text-center text-red-500">{error || 'Mascota no encontrada'}</div>;

  const canEdit = role === 'ADMIN' || role === 'VOLUNTEER';
  const canChangeStatus = role === 'ADMIN' || role === 'VETERINARIAN';
  const canGenerateQR = role === 'ADMIN' || role === 'VOLUNTEER' || role === 'VETERINARIAN';
  const canRequestAdoption = role === 'ADOPTER' && pet.status === 'AVAILABLE';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{pet.name}</h1>
        {canEdit && (
          <Button variant="outline" onClick={() => navigate(`/admin/pets/${id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" /> Editar Perfil
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex gap-4">
              <div className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {pet.mainPhotoUrl ? (
                  <img src={pet.mainPhotoUrl} alt={pet.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">Sin foto</div>
                )}
              </div>
              <div className="space-y-4 flex-1">
                <div className="flex justify-between">
                  <StatusBadge status={pet.status as PetStatus} />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Especie</p>
                    <p className="font-medium">{pet.species}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Raza</p>
                    <p className="font-medium">{pet.breed || 'Desconocida'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Edad est.</p>
                    <p className="font-medium">{pet.estimatedAge} meses</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Tamaño</p>
                    <p className="font-medium">{pet.size || 'No especificado'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {canRequestAdoption && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              {existingRequest ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/adoption/my-requests/${existingRequest.id}`)}
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Ver Solicitud Existente
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => setShowAdoptionConfirm(true)}
                  disabled={isSubmitting}
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Solicitar Adopción
                </Button>
              )}
            </div>
          )}

          {canChangeStatus && (
            <PetStatusSelector
              petId={pet.id}
              currentStatus={pet.status}
              onStatusChanged={(newStatus) => setPet({...pet, status: newStatus})}
            />
          )}

          {canGenerateQR && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              {qrUrl ? (
                <QRDisplay qrCodeUrl={qrUrl} petName={pet.name} />
              ) : (
                <div className="py-8">
                  <p className="text-sm text-gray-500 mb-4">Esta mascota aún no tiene un código QR.</p>
                  <Button onClick={generateQR} variant="outline" className="w-full">
                    <QrIcon className="w-4 h-4 mr-2" /> Generar QR
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showAdoptionConfirm}
        onOpenChange={setShowAdoptionConfirm}
        onConfirm={handleAdoptionRequest}
        title="Solicitar Adopción"
        description={`¿Estás seguro de que deseas solicitar adoptar a ${pet.name}?`}
        confirmText="Solicitar"
      />
    </div>
  );
}
