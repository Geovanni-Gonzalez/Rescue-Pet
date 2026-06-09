import { Button } from './ui/button';
import { ADOPTION_STATUS, type AdoptionRequestStatusType } from '../design/status';

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
            {ADOPTION_STATUS[status].label}
          </Button>
        );
      })}
    </div>
  );
}
