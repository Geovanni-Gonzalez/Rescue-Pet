import { useState } from 'react';
import type { PetStatus } from './StatusBadge';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { ConfirmDialog } from './ConfirmDialog';
import { apiClient, getApiErrorMessage } from '../lib/api';

interface PetStatusSelectorProps {
  petId: string;
  currentStatus: PetStatus;
  onStatusChanged: (newStatus: PetStatus) => void;
}

const STATUS_TRANSITIONS: Record<PetStatus, { value: PetStatus; label: string }[]> = {
  QUARANTINE: [
    { value: 'AVAILABLE', label: 'Disponible' },
    { value: 'TREATMENT', label: 'En Tratamiento' },
  ],
  AVAILABLE: [
    { value: 'TREATMENT', label: 'En Tratamiento' },
    { value: 'ADOPTED', label: 'Adoptado' },
  ],
  TREATMENT: [
    { value: 'AVAILABLE', label: 'Disponible' },
    { value: 'DECEASED', label: 'Fallecido' },
  ],
  ADOPTED: [],
  DECEASED: [],
};

export function PetStatusSelector({ petId, currentStatus, onStatusChanged }: PetStatusSelectorProps) {
  const [selectedStatus, setSelectedStatus] = useState<PetStatus>(currentStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingStatus, setPendingStatus] = useState<PetStatus | null>(null);
  const [reason, setReason] = useState('');

  const allowedTransitions = STATUS_TRANSITIONS[currentStatus];
  const isTerminal = allowedTransitions.length === 0;

  const handleUpdate = async () => {
    if (selectedStatus === currentStatus) return;

    // DECEASED requires double confirmation
    if (selectedStatus === 'DECEASED') {
      setPendingStatus('DECEASED');
      return;
    }

    await executeStatusChange(selectedStatus);
  };

  const executeStatusChange = async (status: PetStatus) => {
    setIsLoading(true);
    setError('');
    try {
      await apiClient.patch(`/animals/${petId}/status`, { status, reason: reason || undefined });
      onStatusChanged(status);
      setPendingStatus(null);
      setReason('');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'No se pudo actualizar el estado.'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isTerminal) {
    return (
      <div className="p-4 bg-muted border border-border rounded-lg">
        <p className="text-sm text-muted-foreground text-center">
          Estado terminal — no se permiten más transiciones.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
      <div>
        <Label>Actualizar Estado</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Selecciona el nuevo estado según la evaluación clínica o proceso de adopción.
        </p>

        <div className="space-y-2">
          <div className="flex gap-2">
            <select
              className="flex-1 h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as PetStatus)}
            >
              <option value={currentStatus} disabled>
                Actual: {currentStatus}
              </option>
              {allowedTransitions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <Button
              onClick={handleUpdate}
              disabled={isLoading || selectedStatus === currentStatus}
            >
              Guardar
            </Button>
          </div>

          <input
            type="text"
            placeholder="Motivo (opcional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground"
          />
        </div>

        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>

      {/* Double confirmation for DECEASED */}
      <ConfirmDialog
        open={pendingStatus === 'DECEASED'}
        onOpenChange={(open) => { if (!open) setPendingStatus(null); }}
        title="Confirmar: Marcar como Fallecido"
        description="Esta acción es irreversible. El animal quedará en estado terminal y no podrá volver a ningún estado activo. ¿Confirmas que el animal ha fallecido?"
        confirmText="Sí, marcar como Fallecido"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={() => executeStatusChange('DECEASED')}
      />
    </div>
  );
}
