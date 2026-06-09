import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/ui/button';
import { Alert } from '../components/ui/alert';
import { Card, CardContent } from '../components/ui/card';
import { Syringe, AlertTriangle, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { apiClient, getApiErrorMessage } from '../lib/api';

interface VaccineAlert {
  id: string;
  vaccineType: string;
  appliedAt: string;
  nextDueAt: string;
  status: 'PENDING' | 'COMPLETED' | 'POSTPONED';
  postponedTo?: string;
  animal: { id: string; name: string; species: string };
}

export function ImmunizationAlerts() {
  const { role } = useAuth();
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState<VaccineAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [postponeId, setPostponeId] = useState<string | null>(null);
  const [postponeDate, setPostponeDate] = useState('');
  const [isActing, setIsActing] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/tasks/immunization-alerts');
        setAlerts(res.data.alerts ?? []);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Error al cargar las alertas'));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleComplete = async (id: string) => {
    setIsActing(true);
    try {
      await apiClient.post(`/tasks/immunization-alerts/${id}/complete`);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error al confirmar la vacuna'));
    } finally {
      setIsActing(false);
    }
  };

  const handlePostpone = async (id: string) => {
    if (!postponeDate) {
      setError('Selecciona una nueva fecha para postergar.');
      return;
    }
    setIsActing(true);
    try {
      await apiClient.post(`/tasks/immunization-alerts/${id}/postpone`, {
        postponedTo: new Date(postponeDate).toISOString(),
      });
      setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: 'POSTPONED', postponedTo: postponeDate } : a));
      setPostponeId(null);
      setPostponeDate('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error al postergar la vacuna'));
    } finally {
      setIsActing(false);
    }
  };

  const isOverdue = (nextDueAt: string) => new Date(nextDueAt) < new Date();

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Syringe className="w-6 h-6 text-rescue-600" />
            Alertas de Inmunización
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Vacunas pendientes en las próximas 72 horas</p>
        </div>
        <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}
        </span>
      </div>

      {error && (
        <Alert variant="danger">{error}</Alert>
      )}

      {alerts.length === 0 ? (
        <EmptyState
          title="Sin alertas pendientes"
          description="No hay vacunas que requieran atención en las próximas 72 horas."
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const overdue = isOverdue(alert.nextDueAt);
            return (
              <Card key={alert.id} className={overdue ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}>
                <CardContent className="pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {overdue
                          ? <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          : <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0" />}
                        <span className="font-semibold text-foreground">{alert.vaccineType}</span>
                        {overdue && (
                          <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Vencida</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Animal:</span>{' '}
                        <button
                          type="button"
                          className="text-rescue-600 hover:underline font-medium"
                          onClick={() => navigate(`/pets/${alert.animal.id}`)}
                        >
                          {alert.animal.name}
                        </button>{' '}
                        <span className="text-muted-foreground">({alert.animal.species})</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Aplicada el: {new Date(alert.appliedAt).toLocaleDateString('es-CR')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Próxima dosis: <span className={overdue ? 'text-red-600 font-medium' : 'text-yellow-700 font-medium'}>
                          {new Date(alert.nextDueAt).toLocaleDateString('es-CR')}
                        </span>
                      </p>
                    </div>

                    {(role === 'ADMIN' || role === 'VETERINARIAN') && alert.status === 'PENDING' && (
                      <div className="flex flex-col gap-2 sm:items-end">
                        <Button
                          size="sm"
                          onClick={() => handleComplete(alert.id)}
                          disabled={isActing}
                          className="flex items-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4" /> Confirmar aplicación
                        </Button>
                        {postponeId === alert.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={postponeDate}
                              onChange={(e) => setPostponeDate(e.target.value)}
                              className="h-8 rounded-md border border-border px-2 text-xs"
                              min={new Date().toISOString().slice(0, 10)}
                            />
                            <Button size="sm" variant="outline" onClick={() => handlePostpone(alert.id)} disabled={isActing}>
                              OK
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setPostponeId(null); setPostponeDate(''); }}>
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPostponeId(alert.id)}
                          >
                            Postergar
                          </Button>
                        )}
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/pets/${alert.animal.id}`)}
                      className="self-start sm:self-center"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
