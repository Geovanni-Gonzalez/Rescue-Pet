import { useRef, useState, useEffect, useCallback } from 'react';
import type { FormEvent, PointerEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingState } from './LoadingState';
import { AdoptionStatusTimeline } from './AdoptionStatusTimeline';
import { StatusTransitionActions } from './StatusTransitionActions';
import { RejectionReasonDialog } from './RejectionReasonDialog';
import { Button } from './ui/button';
import { Alert } from './ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ArrowLeft, User, Calendar, FileText, Clock, Upload, CheckCircle, Download } from 'lucide-react';
import { apiClient, getApiErrorMessage } from '../lib/api';
import type { AdoptionRequestStatusType } from './AdoptionRequestTable';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Pet {
  id: string;
  name: string;
  species: string;
  estimatedBreed?: string;
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

interface Doc {
  id: string;
  documentType: 'ID_CARD' | 'ADDRESS_PROOF';
  fileName: string;
  fileUrl?: string; // only for ADMIN
  version: number;
  status: string;
  uploadedAt: string;
}

interface Contract {
  id: string;
  status: 'GENERATED' | 'SIGNED';
  pdfUrl?: string;
  signedPdfUrl?: string;
  signedAt?: string;
  createdAt: string;
}

interface InterviewSlot {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
}

interface AdoptionRequest {
  id: string;
  status: AdoptionRequestStatusType;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  animal: Pet;
  adopter: Adopter;
  documents: Doc[];
  contract?: Contract;
  interviewSlot?: InterviewSlot;
}

interface AvailableSlot {
  id: string;
  startsAt: string;
  endsAt: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  ID_CARD: 'Cédula de identidad',
  ADDRESS_PROOF: 'Comprobante de domicilio',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AdoptionRequestDetail() {
  const { id } = useParams();
  const { role } = useAuth();
  const navigate = useNavigate();

  const [request, setRequest] = useState<AdoptionRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);

  // Documents
  const [docType, setDocType] = useState<'ID_CARD' | 'ADDRESS_PROOF'>('ID_CARD');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Interview slot picker
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [showSlotPicker, setShowSlotPicker] = useState(false);

  // Signature canvas
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchRequest = useCallback(async () => {
    const res = await apiClient.get(`/adoption-applications/${id}`);
    setRequest(res.data.application);
  }, [id]);

  useEffect(() => {
    fetchRequest()
      .catch((err: unknown) => setError(getApiErrorMessage(err, 'No se pudo cargar la solicitud')))
      .finally(() => setIsLoading(false));
  }, [fetchRequest]);

  // ── Status change ──────────────────────────────────────────────────────────

  const handleStatusChange = async (newStatus: AdoptionRequestStatusType, rejectionReason?: string) => {
    if (!request) return;
    if (newStatus === 'REJECTED' && !rejectionReason) {
      setShowRejectionDialog(true);
      return;
    }
    setIsUpdating(true);
    setError('');
    try {
      const res = await apiClient.patch(`/adoption-applications/${request.id}/status`, {
        status: newStatus,
        rejectionReason,
      });
      setRequest(res.data.application); // ← fix: was res.data.request
      setShowRejectionDialog(false);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'No se pudo actualizar el estado de la solicitud.'));
    } finally {
      setIsUpdating(false);
    }
  };

  // ── Document upload ────────────────────────────────────────────────────────

  const handleDocumentUpload = async (event: FormEvent) => {
    event.preventDefault();
    if (!request || !docFile) return;
    setIsUploadingDoc(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', docFile);
      formData.append('documentType', docType);
      await apiClient.post(`/adoption-applications/${request.id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocFile(null);
      await fetchRequest();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'No se pudo cargar el documento.'));
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // ── Interview scheduling ───────────────────────────────────────────────────

  const openSlotPicker = async () => {
    setShowSlotPicker(true);
    try {
      const res = await apiClient.get('/interview-slots/available');
      setAvailableSlots(res.data.slots ?? []);
    } catch {
      setAvailableSlots([]);
    }
  };

  const handleScheduleInterview = async () => {
    if (!request || !selectedSlotId) return;
    setIsScheduling(true);
    setError('');
    try {
      await apiClient.post(`/adoption-applications/${request.id}/schedule-interview`, { slotId: selectedSlotId });
      setShowSlotPicker(false);
      setSelectedSlotId('');
      await fetchRequest();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'No se pudo agendar la entrevista.'));
    } finally {
      setIsScheduling(false);
    }
  };

  // ── Signature canvas ───────────────────────────────────────────────────────

  const getCanvasPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = getCanvasPoint(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
    setIsDrawing(true);
  };

  const drawSignature = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = event.currentTarget.getContext('2d');
    if (!ctx) return;
    const p = getCanvasPoint(event);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSignContract = async () => {
    if (!request || !canvasRef.current) return;
    const signatureDataUrl = canvasRef.current.toDataURL('image/png');
    // Check canvas is not blank
    const blank = document.createElement('canvas');
    blank.width = canvasRef.current.width;
    blank.height = canvasRef.current.height;
    if (signatureDataUrl === blank.toDataURL()) {
      setError('Por favor dibuja tu firma antes de continuar.');
      return;
    }
    setIsSigning(true);
    setError('');
    try {
      await apiClient.post(`/adoption-applications/${request.id}/contract/sign`, {
        signatureImageUrl: signatureDataUrl,
      });
      await fetchRequest();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'No se pudo firmar el contrato.'));
    } finally {
      setIsSigning(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) return <LoadingState />;
  if (!request) return <div className="p-6 text-center text-red-500">{error || 'Solicitud no encontrada'}</div>;

  const isAdmin = role === 'ADMIN';
  const isAdopter = role === 'ADOPTER';
  const isActive = ['RECEIVED', 'INTERVIEW', 'VISIT'].includes(request.status);
  const canUploadDocs = isAdopter && isActive;
  const canScheduleInterview = isAdopter && request.status === 'RECEIVED' && !request.interviewSlot;
  const canSignContract = isAdopter && request.status === 'APPROVED' && !!request.contract && request.contract.status !== 'SIGNED';

  const uploadedTypes = new Set(request.documents.map((d) => d.documentType));
  const missingDocs = (['ID_CARD', 'ADDRESS_PROOF'] as const).filter((t) => !uploadedTypes.has(t));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Detalle de Solicitud</h1>
      </div>

      {error && (
        <Alert variant="danger">{error}</Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ── Left column ── */}
        <div className="md:col-span-2 space-y-6">

          {/* Timeline + transitions */}
          <Card>
            <CardHeader><CardTitle>Estado de la Solicitud</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <AdoptionStatusTimeline currentStatus={request.status} />
              {request.status === 'REJECTED' && request.rejectionReason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800">Motivo de rechazo</p>
                  <p className="text-sm text-red-700 mt-1">{request.rejectionReason}</p>
                </div>
              )}
              {isAdmin && (
                <div className="pt-4 border-t border-border">
                  <p className="text-sm font-medium text-foreground mb-3">Cambiar Estado</p>
                  <StatusTransitionActions
                    currentStatus={request.status}
                    onStatusChange={handleStatusChange}
                    isRejecting={isUpdating}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Interview slot */}
          {request.interviewSlot && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" /> Entrevista Agendada
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Fecha: </span>
                  <span className="font-medium">
                    {new Date(request.interviewSlot.startsAt).toLocaleDateString('es-CR', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Hora: </span>
                  <span className="font-medium">
                    {new Date(request.interviewSlot.startsAt).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                    {' — '}
                    {new Date(request.interviewSlot.endsAt).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
              </CardContent>
            </Card>
          )}

          {/* Schedule interview (ADOPTER, status RECEIVED) */}
          {canScheduleInterview && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" /> Agendar Entrevista
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!showSlotPicker ? (
                  <Button variant="outline" onClick={openSlotPicker}>
                    Ver horarios disponibles
                  </Button>
                ) : (
                  <>
                    {availableSlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No hay horarios disponibles en este momento.</p>
                    ) : (
                      <div className="space-y-2">
                        {availableSlots.map((slot) => (
                          <label
                            key={slot.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedSlotId === slot.id
                                ? 'border-rescue-500 bg-rescue-50'
                                : 'border-border hover:bg-muted'
                            }`}
                          >
                            <input
                              type="radio"
                              name="slot"
                              value={slot.id}
                              checked={selectedSlotId === slot.id}
                              onChange={() => setSelectedSlotId(slot.id)}
                              className="text-rescue-600"
                            />
                            <div>
                              <p className="text-sm font-medium">
                                {new Date(slot.startsAt).toLocaleDateString('es-CR', {
                                  weekday: 'short', month: 'short', day: 'numeric',
                                })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(slot.startsAt).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                                {' — '}
                                {new Date(slot.endsAt).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={handleScheduleInterview}
                        disabled={!selectedSlotId || isScheduling}
                      >
                        {isScheduling ? 'Agendando...' : 'Confirmar entrevista'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowSlotPicker(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Adopter info (for admin) */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Información del Adoptante</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Nombre: </span><span className="font-medium">{request.adopter.fullName}</span></p>
                <p><span className="text-muted-foreground">Email: </span><span className="font-medium">{request.adopter.email}</span></p>
                {request.adopter.phone && (
                  <p><span className="text-muted-foreground">Teléfono: </span><span className="font-medium">{request.adopter.phone}</span></p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Document upload (ADOPTER) */}
          {canUploadDocs && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> Cargar Documentos</CardTitle>
              </CardHeader>
              <CardContent>
                {missingDocs.length > 0 && (
                  <Alert variant="caution" className="mb-3 p-2 text-xs rounded-lg">
                    Pendientes: {missingDocs.map((t) => DOC_TYPE_LABELS[t]).join(', ')}
                  </Alert>
                )}
                <form onSubmit={handleDocumentUpload} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as 'ID_CARD' | 'ADDRESS_PROOF')}
                      className="h-10 rounded-md border border-border px-3 text-sm"
                    >
                      <option value="ID_CARD">Cédula de identidad</option>
                      <option value="ADDRESS_PROOF">Comprobante de domicilio</option>
                    </select>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,image/*"
                      capture="environment"
                      onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                      className="h-10 rounded-md border border-border px-3 text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-rescue-50 file:text-rescue-700"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Formatos permitidos: PDF, JPG, PNG — máx. 10 MB</p>
                  <Button type="submit" size="sm" disabled={isUploadingDoc || !docFile}>
                    {isUploadingDoc ? 'Cargando...' : 'Subir documento'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Documents list */}
          {(request.documents.length > 0 || isAdmin) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Documentos</CardTitle>
              </CardHeader>
              <CardContent>
                {request.documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Sin documentos cargados.</p>
                ) : (
                  <div className="space-y-2">
                    {request.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
                        <div>
                          <p className="text-sm font-medium">{doc.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                            {' · '}v{doc.version}
                            {' · '}{new Date(doc.uploadedAt).toLocaleDateString('es-CR')}
                          </p>
                        </div>
                        {isAdmin && doc.fileUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="w-3 h-3 mr-1" /> Ver
                            </a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Contract */}
          {request.contract && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Contrato de Adopción
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  {request.contract.status === 'SIGNED'
                    ? <CheckCircle className="w-5 h-5 text-green-500" />
                    : <Clock className="w-5 h-5 text-yellow-500" />}
                  <span className="text-sm font-medium">
                    {request.contract.status === 'SIGNED' ? 'Firmado' : 'Pendiente de firma'}
                  </span>
                  {request.contract.signedAt && (
                    <span className="text-xs text-muted-foreground">
                      — {new Date(request.contract.signedAt).toLocaleDateString('es-CR')}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {request.contract.pdfUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={request.contract.pdfUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="w-3 h-3 mr-1" /> Ver contrato
                      </a>
                    </Button>
                  )}
                  {request.contract.signedPdfUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={request.contract.signedPdfUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="w-3 h-3 mr-1" /> Descargar firmado
                      </a>
                    </Button>
                  )}
                </div>

                {/* Signature canvas for ADOPTER */}
                {canSignContract && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <p className="text-sm font-medium text-foreground">Firma el contrato:</p>
                    <canvas
                      ref={canvasRef}
                      width={640}
                      height={160}
                      className="w-full touch-none rounded-lg border-2 border-dashed border-border bg-card cursor-crosshair"
                      onPointerDown={startDrawing}
                      onPointerMove={drawSignature}
                      onPointerUp={() => setIsDrawing(false)}
                      onPointerLeave={() => setIsDrawing(false)}
                    />
                    <p className="text-xs text-muted-foreground">Firma usando el ratón o tu dedo (pantalla táctil).</p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={clearSignature}>
                        Limpiar
                      </Button>
                      <Button type="button" size="sm" onClick={handleSignContract} disabled={isSigning}>
                        {isSigning ? 'Firmando...' : 'Finalizar y firmar'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right column ── */}
        <div className="space-y-6">
          {/* Pet info */}
          <Card>
            <CardHeader><CardTitle>Mascota</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-3 mb-4">
                {request.animal.mainPhotoUrl ? (
                  <img src={request.animal.mainPhotoUrl} alt={request.animal.name} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">Sin foto</div>
                )}
                <div>
                  <p className="font-semibold">{request.animal.name}</p>
                  <p className="text-sm text-muted-foreground">{request.animal.species}{request.animal.estimatedBreed ? ` — ${request.animal.estimatedBreed}` : ''}</p>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                {request.animal.energyLevel && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Energía:</span>
                    <span className="font-medium">{request.animal.energyLevel}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Con niños:</span>
                  <span className="font-medium">{request.animal.goodWithChildren ? 'Sí' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Con otras mascotas:</span>
                  <span className="font-medium">{request.animal.goodWithPets ? 'Sí' : 'No'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="w-4 h-4" /> Fechas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-muted-foreground">Solicitud</p>
                <p className="font-medium">{new Date(request.createdAt).toLocaleDateString('es-CR')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Última actualización</p>
                <p className="font-medium">{new Date(request.updatedAt).toLocaleDateString('es-CR')}</p>
              </div>
            </CardContent>
          </Card>

          {/* Document checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Documentos requeridos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(['ID_CARD', 'ADDRESS_PROOF'] as const).map((type) => {
                const uploaded = uploadedTypes.has(type);
                return (
                  <div key={type} className="flex items-center gap-2 text-sm">
                    <div className={`w-4 h-4 rounded-full flex-shrink-0 ${uploaded ? 'bg-green-500' : 'bg-muted'}`}>
                      {uploaded && <CheckCircle className="w-4 h-4 text-white" />}
                    </div>
                    <span className={uploaded ? 'text-green-700' : 'text-muted-foreground'}>
                      {DOC_TYPE_LABELS[type]}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
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
