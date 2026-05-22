import { Button } from './ui/button';
import type { AdoptionRequestStatusType } from './AdoptionRequestTable';

interface StatusTransitionActionsProps {
  currentStatus: AdoptionRequestStatusType;
  onStatusChange: (newStatus: AdoptionRequestStatusType, rejectionReason?: string) => void;
  isRejecting: boolean;
}

const TRANSITIONS: Record<AdoptionRequestStatusType, AdoptionRequestStatusType[]> = {
  RECEIVED: ['INTERVIEW', 'REJECTED'],
  INTERVIEW: ['VISIT', 'REJECTED'],
  VISIT: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: [],
};

const STATUS_LABELS: Record<AdoptionRequestStatusType, string> = {
  RECEIVED: 'Recibida',
  INTERVIEW: 'Entrevista',
  VISIT: 'Visita',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
};

export function StatusTransitionActions({ currentStatus, onStatusChange, isRejecting }: StatusTransitionActionsProps) {
  const allowedTransitions = TRANSITIONS[currentStatus];

  if (allowedTransitions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {allowedTransitions.map((status) => {
        if (status === 'REJECTED') {
          return (
            <Button
              key={status}
              variant="destructive"
              size="sm"
              onClick={() => onStatusChange(status)}
              disabled={isRejecting}
            >
              {isRejecting ? 'Rechazando...' : 'Rechazar'}
            </Button>
          );
        }

        return (
          <Button
            key={status}
            variant="outline"
            size="sm"
            onClick={() => onStatusChange(status)}
          >
            {STATUS_LABELS[status]}
          </Button>
        );
      })}
    </div>
  );
}
