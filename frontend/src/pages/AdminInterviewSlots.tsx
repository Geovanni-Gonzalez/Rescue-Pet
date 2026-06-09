import { useState, useEffect } from 'react';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/ui/button';
import { Alert } from '../components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Calendar, Plus, Trash2, CheckCircle, Clock } from 'lucide-react';
import { apiClient, getApiErrorMessage } from '../lib/api';

interface Slot {
  id: string;
  startsAt: string;
  endsAt: string;
  status: 'available' | 'reserved' | 'cancelled';
  reservedByApplicationId?: string;
}

export function AdminInterviewSlots() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchSlots = async () => {
    try {
      const res = await apiClient.get('/interview-slots/available');
      setSlots(res.data.slots ?? []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error al cargar los slots'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchSlots(); }, []);

  const handleCreate = async () => {
    if (!startsAt || !endsAt) return;
    setIsCreating(true);
    setError('');
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
      setError(getApiErrorMessage(err, 'Error al crear el slot'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await apiClient.patch(`/interview-slots/${id}/cancel`);
      setSlots((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error al cancelar el slot'));
    } finally {
      setCancellingId(null);
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'available') return <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Disponible</span>;
    if (status === 'reserved') return <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Reservado</span>;
    return <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Cancelado</span>;
  };

  if (isLoading) return <LoadingState />;

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Inicio *</label>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full h-10 rounded-md border border-border px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Fin *</label>
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  min={startsAt || new Date().toISOString().slice(0, 16)}
                  className="w-full h-10 rounded-md border border-border px-3 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={isCreating || !startsAt || !endsAt}>
                {isCreating ? 'Creando...' : 'Crear horario'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
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
                </div>
              </div>
              <div className="flex items-center gap-3">
                {statusBadge(slot.status)}
                {slot.status === 'available' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancel(slot.id)}
                    disabled={cancellingId === slot.id}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
