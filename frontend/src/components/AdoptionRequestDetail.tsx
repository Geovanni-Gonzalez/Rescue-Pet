import { useRef, useState, useEffect } from 'react';
import type { FormEvent, PointerEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingState } from './LoadingState';
import { AdoptionStatusTimeline } from './AdoptionStatusTimeline';
import { StatusTransitionActions } from './StatusTransitionActions';
import { RejectionReasonDialog } from './RejectionReasonDialog';
import { Button } from './ui/button';
import { ArrowLeft, User, Calendar, FileText } from 'lucide-react';
import { apiClient } from '../lib/api';
import type { AdoptionRequestStatusType } from './AdoptionRequestTable';
import { getApiErrorMessage } from '../lib/api';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  mainPhotoUrl?: string;
  status: string;
  energyLevel?: string;
  spaceNeed?: string;
  goodWithChildren: boolean;
  goodWithPets: boolean;
}

interface Adopter {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
}

interface Document {
  id: string;
  type: string;
  fileName: string;
  fileUrl: string;
  createdAt: string;
}

interface Contract {
  id: string;
  status: string;
  pdfUrl?: string;
  signedPdfUrl?: string;
  createdAt: string;
}

interface AdoptionRequest {
  id: string;
  status: AdoptionRequestStatusType;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  pet: Pet;
  adopter: Adopter;
  documents: Document[];
  contract?: Contract;
}

export function AdoptionRequestDetail() {
  const { id } = useParams();
  const { role } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest] = useState<AdoptionRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [documentForm, setDocumentForm] = useState({ type: 'ID_CARD', fileName: '', fileUrl: '' });
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [isSigningContract, setIsSigningContract] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fetchRequest = async () => {
    const res = await apiClient.get(`/adoption-applications/${id}`);
    setRequest(res.data.application);
  };

  useEffect(() => {
    fetchRequest()
      .catch((err: unknown) => setError(getApiErrorMessage(err, 'No se pudo cargar la solicitud')))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleStatusChange = async (newStatus: AdoptionRequestStatusType, rejectionReason?: string) => {
    if (!request) return;

    if (newStatus === 'REJECTED' && !rejectionReason) {
      setShowRejectionDialog(true);
      return;
    }

    setIsUpdating(true);
    try {
      const res = await apiClient.patch(`/adoption-applications/${request.id}/status`, {
        status: newStatus,
        rejectionReason,
      });
      setRequest(res.data.request);
      setShowRejectionDialog(false);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Error al actualizar el estado'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDocumentSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!request) return;

    setIsUploadingDocument(true);
    setError('');
    try {
      await apiClient.post(`/adoption-applications/${request.id}/documents`, {
        documentType: documentForm.type,
        fileName: documentForm.fileName,
        fileUrl: documentForm.fileUrl,
      });
      setDocumentForm({ type: 'ID_CARD', fileName: '', fileUrl: '' });
      await fetchRequest();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Error al cargar el documento'));
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const getCanvasPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const point = getCanvasPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.strokeStyle = '#111827';
    setIsDrawing(true);
  };

  const drawSignature = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const context = event.currentTarget.getContext('2d');
    if (!context) return;

    const point = getCanvasPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const signContract = async () => {
    if (!request || !canvasRef.current) return;

    setIsSigningContract(true);
    setError('');
    try {
      await apiClient.post(`/adoption-applications/${request.id}/contract/sign`, {
        signatureImageUrl: canvasRef.current.toDataURL('image/png'),
      });
      await fetchRequest();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Error al firmar el contrato'));
    } finally {
      setIsSigningContract(false);
    }
  };

  if (isLoading) return <LoadingState />;
  if (error || !request) return <div className="p-6 text-center text-red-500">{error || 'Solicitud no encontrada'}</div>;

  const isAdmin = role === 'ADMIN';
  const canUploadDocuments = role === 'ADOPTER' && ['RECEIVED', 'INTERVIEW', 'VISIT'].includes(request.status);
  const canSignContract = role === 'ADOPTER' && request.status === 'APPROVED' && request.contract?.status !== 'SIGNED';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Detalle de Solicitud</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Estado de la Solicitud</h2>
            <AdoptionStatusTimeline currentStatus={request.status} />
            {isAdmin && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Cambiar Estado</h3>
                <StatusTransitionActions
                  currentStatus={request.status}
                  onStatusChange={handleStatusChange}
                  isRejecting={isUpdating}
                />
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Información del Adoptante
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Nombre</p>
                <p className="font-medium">{request.adopter.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{request.adopter.email}</p>
              </div>
              {request.adopter.phone && (
                <div>
                  <p className="text-sm text-gray-500">Teléfono</p>
                  <p className="font-medium">{request.adopter.phone}</p>
                </div>
              )}
            </div>
          </div>

          {request.status === 'REJECTED' && request.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="font-semibold text-red-800 mb-2">Motivo de Rechazo</h3>
              <p className="text-red-700">{request.rejectionReason}</p>
            </div>
          )}

          {canUploadDocuments && (
            <form onSubmit={handleDocumentSubmit} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Cargar Documentos
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={documentForm.type}
                  onChange={(event) => setDocumentForm((prev) => ({ ...prev, type: event.target.value }))}
                  className="h-10 rounded-md border border-gray-300 px-3 text-sm"
                >
                  <option value="ID_CARD">Cédula de identidad</option>
                  <option value="ADDRESS_PROOF">Comprobante de domicilio</option>
                  <option value="CONTRACT">Contrato</option>
                </select>
                <input
                  value={documentForm.fileName}
                  onChange={(event) => setDocumentForm((prev) => ({ ...prev, fileName: event.target.value }))}
                  className="h-10 rounded-md border border-gray-300 px-3 text-sm"
                  placeholder="Nombre del archivo"
                  required
                />
                <input
                  type="url"
                  value={documentForm.fileUrl}
                  onChange={(event) => setDocumentForm((prev) => ({ ...prev, fileUrl: event.target.value }))}
                  className="h-10 rounded-md border border-gray-300 px-3 text-sm"
                  placeholder="https://..."
                  required
                />
              </div>
              <Button type="submit" disabled={isUploadingDocument}>
                {isUploadingDocument ? 'Cargando...' : 'Guardar documento'}
              </Button>
            </form>
          )}

          {request.documents.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documentos
              </h2>
              <div className="space-y-2">
                {request.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{doc.fileName}</p>
                      <p className="text-sm text-gray-500">{doc.type}</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                        Ver
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {request.contract && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Contrato</h2>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Estado</p>
                  <p className="font-medium">{request.contract.status}</p>
                </div>
                {request.contract.pdfUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={request.contract.pdfUrl} target="_blank" rel="noopener noreferrer">
                      Ver Contrato
                    </a>
                  </Button>
                )}
                {canSignContract && (
                  <div className="pt-4 space-y-3">
                    <canvas
                      ref={canvasRef}
                      width={640}
                      height={180}
                      className="w-full h-44 touch-none rounded-lg border border-gray-300 bg-white"
                      onPointerDown={startDrawing}
                      onPointerMove={drawSignature}
                      onPointerUp={() => setIsDrawing(false)}
                      onPointerLeave={() => setIsDrawing(false)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={clearSignature}>
                        Limpiar firma
                      </Button>
                      <Button type="button" size="sm" onClick={signContract} disabled={isSigningContract}>
                        {isSigningContract ? 'Firmando...' : 'Finalizar y firmar'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Mascota</h2>
            <div className="flex gap-4 mb-4">
              {request.pet.mainPhotoUrl && (
                <img
                  src={request.pet.mainPhotoUrl}
                  alt={request.pet.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
              )}
              <div>
                <p className="font-semibold text-lg">{request.pet.name}</p>
                <p className="text-sm text-gray-500">{request.pet.species} {request.pet.breed || ''}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Estado actual:</span>
                <span className="font-medium">{request.pet.status}</span>
              </div>
              {request.pet.energyLevel && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Nivel de energía:</span>
                  <span className="font-medium">{request.pet.energyLevel}</span>
                </div>
              )}
              {request.pet.spaceNeed && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Espacio requerido:</span>
                  <span className="font-medium">{request.pet.spaceNeed}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Bueno con niños:</span>
                <span className="font-medium">{request.pet.goodWithChildren ? 'Sí' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Bueno con otras mascotas:</span>
                <span className="font-medium">{request.pet.goodWithPets ? 'Sí' : 'No'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Fechas
            </h2>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-gray-500">Fecha de solicitud</p>
                <p className="font-medium">{new Date(request.createdAt).toLocaleString('es-ES')}</p>
              </div>
              <div>
                <p className="text-gray-500">Última actualización</p>
                <p className="font-medium">{new Date(request.updatedAt).toLocaleString('es-ES')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <RejectionReasonDialog
        open={showRejectionDialog}
        onOpenChange={setShowRejectionDialog}
        onConfirm={(reason) => handleStatusChange('REJECTED', reason)}
        isSubmitting={isUpdating}
      />
    </div>
  );
}
