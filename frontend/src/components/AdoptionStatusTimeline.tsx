import React from 'react';
import { Check, Circle } from 'lucide-react';

export type AdoptionRequestStatusType = 'RECEIVED' | 'INTERVIEW' | 'VISIT' | 'APPROVED' | 'REJECTED';

interface AdoptionStatusTimelineProps {
  currentStatus: AdoptionRequestStatusType;
}

const STATUS_ORDER: AdoptionRequestStatusType[] = ['RECEIVED', 'INTERVIEW', 'VISIT', 'APPROVED'];

const STATUS_LABELS: Record<AdoptionRequestStatusType, string> = {
  RECEIVED: 'Solicitud Recibida',
  INTERVIEW: 'Entrevista',
  VISIT: 'Visita',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
};

export function AdoptionStatusTimeline({ currentStatus }: AdoptionStatusTimelineProps) {
  if (currentStatus === 'REJECTED') {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
        <Circle className="w-5 h-5 text-red-600 fill-red-600" />
        <span className="font-medium text-red-800">Solicitud Rechazada</span>
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
                    ? 'bg-green-500 border-green-500 text-white'
                    : isCurrent
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-gray-100 border-gray-300 text-gray-400'
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
                  isCurrent ? 'font-medium text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                {STATUS_LABELS[status]}
              </span>
            </div>
            {index < STATUS_ORDER.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 ${
                  index < currentIndex ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
