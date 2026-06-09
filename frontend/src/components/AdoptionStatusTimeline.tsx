import React from 'react';
import { Check, Circle } from 'lucide-react';
import { ADOPTION_STATUS, roleClasses, roleSolid, type AdoptionRequestStatusType } from '../design/status';

export type { AdoptionRequestStatusType };

interface AdoptionStatusTimelineProps {
  currentStatus: AdoptionRequestStatusType;
}

const STATUS_ORDER: AdoptionRequestStatusType[] = ['RECEIVED', 'INTERVIEW', 'VISIT', 'APPROVED'];

export function AdoptionStatusTimeline({ currentStatus }: AdoptionStatusTimelineProps) {
  if (currentStatus === 'REJECTED') {
    return (
      <div className={`flex items-center gap-2 p-4 rounded-lg border ${roleClasses.danger}`}>
        <Circle className="w-5 h-5 fill-current" />
        <span className="font-medium">Solicitud Rechazada</span>
      </div>
    );
  }

  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  return (
    <div className="flex items-center justify-between py-4">
      {STATUS_ORDER.map((status, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <React.Fragment key={status}>
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  isCompleted
                    ? roleSolid.success
                    : isCurrent
                    ? roleSolid.info
                    : 'bg-muted border-border text-muted-foreground'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-xs mt-2 text-center ${
                  isCurrent
                    ? 'font-medium text-status-info-fg'
                    : isCompleted
                    ? 'text-status-success-fg'
                    : 'text-muted-foreground'
                }`}
              >
                {ADOPTION_STATUS[status].label}
              </span>
            </div>
            {index < STATUS_ORDER.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 ${
                  index < currentIndex ? 'bg-status-success-solid' : 'bg-border'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
