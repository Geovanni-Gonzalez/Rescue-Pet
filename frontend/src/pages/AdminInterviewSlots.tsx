import { useState, useEffect } from 'react';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/ui/button';
import { Alert } from '../components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Calendar, Plus, Trash2, CheckCircle, Clock } from 'lucide-react';
import { apiClient, getApiErrorMessage } from '../lib/api';

interface Slot {
  id: string;
  startsAt: string;
  endsAt: string;
  status: 'available' | 'reserved' | 'cancelled';
  reservedByApplicationId?: string;
  reservation?: {
    applicationId: string;
    adopterName?: string | null;
    animalName?: string | null;
  } | null;
}

/**
 * Valor "YYYY-MM-DDTHH:mm" en hora LOCAL para inputs datetime-local.
 * (toISOString() está en UTC y desplazaba el mínimo +6h, bloqueando
 * la creación de horarios del día en curso.)
 */
function toLocalInputValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function AdminInterviewSlots() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [formError, setFormError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Slot | null>(null);

  const fetchSlots = async () => {
    try {
      const res = await apiClient.get('/interview-slots');
      setSlots(res.data.slots ?? []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudieron cargar los horarios de entrevista.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchSlots(); }, []);

  const handleCreate = async () => {
    if (!startsAt || !endsAt) return;
    setFormError('');
    if (new Date(endsAt) <= new Date(startsAt)) {
      setFormError('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }
    if (new Date(startsAt) <= new Date()) {
      setFormError('El horario debe estar en el futuro.');
      return;
    }
    setIsCreating(true);
    try {
      await apiClient.post('/interview-slots', {
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      });
      setStartsAt('');
      setEndsAt('');
      setShowForm(false);
      await fetchSlots();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'No se pudo crear el horario.'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = async (slot: Slot) => {
    setCancellingId(slot.id);
    setError('');
    try {
      await apiClient.patch(`/interview-slots/${slot.id}/cancel`);
      await fetchSlots();
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo cancelar el horario.'));
    } finally {
      setCancellingId(null);
    }
  };

  const requestCancel = (slot: Slot) => {
    if (slot.status === 'reserved') {
      // CU-17 1A: cancelar un slot reservado notifica al adoptante — pedir confirmación.
      setCancelTarget(slot);
    } else {
      handleCancel(slot);
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'available') return <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Disponible</span>;
    if (status === 'reserved') return <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Reservado</span>;
    return <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Cancelado</span>;
  };

  if (isLoading) return <LoadingState />;

  const nowLocal = toLocalInputValue(new Date());

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 text-rescue-600" />
            Agenda de Entrevistas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Crea horarios disponibles para que los adoptantes agenden su entrevista.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="w-4 h-4 mr-2" /> Nuevo horario
        </Button>
      </div>

      {error && (
        <Alert variant="danger">{error}</Alert>
      )}

      {/* Create form */}
      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Crear Horario Disponible</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {formError && <Alert variant="danger">{formError}</Alert>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1" htmlFor="slot-start">Inicio *</label>
                <input
                  id="slot-start"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  min={nowLocal}
                  className="w-full h-10 rounded-md border border-border px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1" htmlFor="slot-end">Fin *</label>
                <input
                  id="slot-end"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  min={startsAt || nowLocal}
                  className="w-full h-10 rounded-md border border-border px-3 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={isCreating || !startsAt || !endsAt}>
                {isCreating ? 'Creando...' : 'Crear horario'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setFormError(''); }}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Slots list */}
      {slots.length === 0 ? (
        <EmptyState
          title="Sin horarios disponibles"
          description="Crea horarios para que los adoptantes puedan agendar su entrevista."
        />
      ) : (
        <div className="space-y-2">
          {slots.map((slot) => (
            <div key={slot.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                {slot.status === 'available'
                  ? <Clock className="w-4 h-4 text-green-500 flex-shrink-0" />
                  : <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                <div>
                  <p className="text-sm font-medium">
                    {new Date(slot.startsAt).toLocaleDateString('es-CR', {
                      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(slot.startsAt).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                    {' — '}
                    {new Date(slot.endsAt).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {slot.status === 'reserved' && slot.reservation && (
                    <p className="text-xs text-blue-700 mt-0.5">
                      {slot.reservation.adopterName ?? 'Adoptante'}
                      {slot.reservation.animalName ? ` · ${slot.reservation.animalName}` : ''}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {statusBadge(slot.status)}
                {(slot.status === 'available' || slot.status === 'reserved') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => requestCancel(slot)}
                    disabled={cancellingId === slot.id}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    title={slot.status === 'reserved' ? 'Cancelar entrevista reservada' : 'Cancelar horario'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CU-17 1A: confirmación al cancelar un slot reservado */}
      <ConfirmDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => { if (!open) setCancelTarget(null); }}
        title="Cancelar entrevista reservada"
        description={
          cancelTarget
            ? `Este horario está reservado por ${cancelTarget.reservation?.adopterName ?? 'un adoptante'}. Al cancelarlo, su solicitud volverá a "Recibida" y se le notificará para que elija un nuevo horario.`
            : ''
        }
        onConfirm={() => { if (cancelTarget) handleCancel(cancelTarget); }}
        variant="destructive"
        confirmText="Cancelar entrevista"
        cancelText="Volver"
      />
    </div>
  );
}
