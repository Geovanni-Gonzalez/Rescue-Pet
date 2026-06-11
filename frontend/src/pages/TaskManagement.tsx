import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/ui/button';
import { Alert } from '../components/ui/alert';
import { Card, CardContent } from '../components/ui/card';
import { ClipboardCheck, Plus, CheckCircle, Clock, AlertTriangle, Filter } from 'lucide-react';
import { apiClient, getApiErrorMessage } from '../lib/api';

interface Task {
  id: string;
  type: string;
  assignedRole: string;
  scheduledAt: string;
  status: string;
  description?: string;
  completedAt?: string;
  comment?: string;
  animal?: { id: string; name: string; species: string };
  createdBy?: { id: string; fullName: string };
  completedBy?: { id: string; fullName: string };
}

const TASK_TYPES = ['HEALTH', 'MEDICATION', 'CLEANING', 'FEEDING', 'MAINTENANCE'] as const;
const TASK_TYPE_LABELS: Record<string, string> = {
  HEALTH: 'Salud',
  MEDICATION: 'Medicación',
  CLEANING: 'Limpieza',
  FEEDING: 'Alimentación',
  MAINTENANCE: 'Mantenimiento',
};
const ROLE_LABELS: Record<string, string> = {
  VETERINARIAN: 'Veterinario',
  VOLUNTEER: 'Voluntario',
};

export function TaskManagement() {
  const { role } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  const [completeComment, setCompleteComment] = useState('');

  // Create form state
  const [newTask, setNewTask] = useState({
    type: 'HEALTH' as string,
    assignedRole: 'VETERINARIAN' as string,
    scheduledAt: '',
    description: '',
    animalId: '',
  });
  const [animals, setAnimals] = useState<{ id: string; name: string }[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      const res = await apiClient.get(`/tasks?${params}`);
      setTasks(res.data.tasks);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudieron cargar las tareas.'));
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (showCreateForm && animals.length === 0) {
      apiClient.get('/animals').then((res) => {
        setAnimals((res.data.animals || []).map((a: any) => ({ id: a.id, name: a.name })));
      }).catch(() => {});
    }
  }, [showCreateForm, animals.length]);

  const handleCreate = async () => {
    if (!newTask.scheduledAt) {
      setError('Selecciona una fecha programada');
      return;
    }
    setIsCreating(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        type: newTask.type,
        assignedRole: newTask.assignedRole,
        scheduledAt: new Date(newTask.scheduledAt).toISOString(),
      };
      if (newTask.description) body['description'] = newTask.description;
      if (newTask.animalId) body['animalId'] = newTask.animalId;

      await apiClient.post('/tasks', body);
      setShowCreateForm(false);
      setNewTask({ type: 'HEALTH', assignedRole: 'VETERINARIAN', scheduledAt: '', description: '', animalId: '' });
      load();
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo crear la tarea.'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleComplete = async (id: string) => {
    setError('');
    try {
      const idempotencyKey = `${id}-${Date.now()}`;
      await apiClient.post(`/tasks/${id}/complete`, { comment: completeComment || undefined }, {
        headers: { 'X-Idempotency-Key': idempotencyKey },
      });
      setCompleting(null);
      setCompleteComment('');
      load();
    } catch (err: any) {
      if (err?.response?.data?.alreadyCompleted) {
        setCompleting(null);
        load();
        return;
      }
      setError(getApiErrorMessage(err, 'No se pudo completar la tarea.'));
    }
  };

  const isOverdue = (date: string) => new Date(date) < new Date();
  const canCreate = role === 'ADMIN' || role === 'VETERINARIAN';

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-rescue-600" />
            Gestión de Tareas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Tareas operativas del refugio</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
            {tasks.length} {tasks.length === 1 ? 'tarea' : 'tareas'}
          </span>
          {canCreate && (
            <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
              <Plus className="w-4 h-4 mr-1" /> Nueva Tarea
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="danger">{error}</Alert>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 rounded-md border border-border px-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="PENDING">Pendientes</option>
          <option value="COMPLETED">Completadas</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-8 rounded-md border border-border px-2 text-sm"
        >
          <option value="">Todos los tipos</option>
          {TASK_TYPES.map((t) => (
            <option key={t} value={t}>{TASK_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <Card className="border-rescue-200 bg-rescue-50/30">
          <CardContent className="pt-4 space-y-3">
            <h3 className="font-semibold text-foreground">Nueva tarea</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Tipo de tarea</label>
                <select
                  value={newTask.type}
                  onChange={(e) => setNewTask({ ...newTask, type: e.target.value })}
                  className="w-full h-9 rounded-md border border-border px-2 text-sm"
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t} value={t}>{TASK_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Responsable</label>
                <select
                  value={newTask.assignedRole}
                  onChange={(e) => setNewTask({ ...newTask, assignedRole: e.target.value })}
                  className="w-full h-9 rounded-md border border-border px-2 text-sm"
                >
                  <option value="VETERINARIAN">Veterinario</option>
                  <option value="VOLUNTEER">Voluntario</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Fecha y hora programadas</label>
                <input
                  type="datetime-local"
                  value={newTask.scheduledAt}
                  onChange={(e) => setNewTask({ ...newTask, scheduledAt: e.target.value })}
                  className="w-full h-9 rounded-md border border-border px-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Animal (opcional)</label>
                <select
                  value={newTask.animalId}
                  onChange={(e) => setNewTask({ ...newTask, animalId: e.target.value })}
                  className="w-full h-9 rounded-md border border-border px-2 text-sm"
                >
                  <option value="">Sin animal asociado</option>
                  {animals.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Descripcion operativa (opcional)</label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
                placeholder="Ej. Aplicar medicamento después de la comida y registrar cualquier reacción."
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={isCreating}>
                {isCreating ? 'Creando...' : 'Crear tarea'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task list */}
      {tasks.length === 0 ? (
        <EmptyState
          title="Sin tareas"
          description={statusFilter === 'PENDING' ? 'No hay tareas pendientes.' : 'No se encontraron tareas con los filtros seleccionados.'}
          icon={<ClipboardCheck className="w-8 h-8" />}
        />
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const overdue = task.status === 'PENDING' && isOverdue(task.scheduledAt);
            const completed = task.status === 'COMPLETED';
            return (
              <Card key={task.id} className={overdue ? 'border-red-200' : completed ? 'border-green-200' : ''}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {completed ? (
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : overdue ? (
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                        )}
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-foreground">
                          {TASK_TYPE_LABELS[task.type] || task.type}
                        </span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          {ROLE_LABELS[task.assignedRole] || task.assignedRole}
                        </span>
                        {overdue && (
                          <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Vencida</span>
                        )}
                        {completed && (
                          <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Completada</span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-foreground">{task.description}</p>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {task.animal && (
                          <span>Animal: <span className="font-medium text-foreground">{task.animal.name}</span></span>
                        )}
                        <span>Programada: {new Date(task.scheduledAt).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        {task.createdBy && <span>Creada por: {task.createdBy.fullName}</span>}
                        {task.completedBy && <span>Completada por: {task.completedBy.fullName}</span>}
                        {task.completedAt && <span>Completada: {new Date(task.completedAt).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                        {task.comment && <span>Comentario: {task.comment}</span>}
                      </div>
                    </div>

                    {task.status === 'PENDING' && (
                      <div className="flex-shrink-0">
                        {completing === task.id ? (
                          <div className="flex flex-col gap-2">
                            <input
                              type="text"
                              value={completeComment}
                              onChange={(e) => setCompleteComment(e.target.value)}
                              placeholder="Ej. Completada sin novedades"
                              className="h-8 rounded-md border border-border px-2 text-xs w-48"
                            />
                            <div className="flex gap-1">
                              <Button size="sm" onClick={() => handleComplete(task.id)}>
                                <CheckCircle className="w-4 h-4 mr-1" /> Confirmar
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => { setCompleting(null); setCompleteComment(''); }}>
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setCompleting(task.id)}>
                            <CheckCircle className="w-4 h-4 mr-1" /> Completar
                          </Button>
                        )}
                      </div>
                    )}
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
