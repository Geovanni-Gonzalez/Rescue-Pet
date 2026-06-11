import { StatusBadge } from './StatusBadge';
import type { PetStatus } from './StatusBadge';
import { petStatusLabel } from '../design/status';

interface PetCardProps {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  status: PetStatus;
  photoUrl?: string;
  onAction?: (id: string) => void;
}

export function PetCard({ id, name, species, breed, age, status, photoUrl, onAction }: PetCardProps) {
  const ageDisplay = age >= 12
    ? `${Math.floor(age / 12)} año${Math.floor(age / 12) > 1 ? 's' : ''}`
    : age > 0
      ? `${age} mes${age > 1 ? 'es' : ''}`
      : 'Edad no registrada';

  return (
    <button
      type="button"
      onClick={() => onAction?.(id)}
      className="group h-full w-full text-left overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-[box-shadow,border-color,transform] duration-200 ease-out-strong hover:shadow-md hover:border-rescue-500/30 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 ease-out-strong [@media(hover:hover)]:group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
            Sin foto
          </div>
        )}
        <div className="absolute top-2.5 right-2.5">
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="px-3.5 pt-3 pb-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-semibold text-foreground leading-tight truncate">{name}</h3>
          {status === 'AVAILABLE' && (
            <span className="text-xs text-rescue-600 font-medium flex-shrink-0">
              {petStatusLabel(status)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {species} · {breed}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{ageDisplay}</p>
      </div>
    </button>
  );
}
