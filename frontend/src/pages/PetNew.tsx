import { PetForm } from '../components/PetForm';
import { PET_STATUS } from '../design/status';

export function PetNew() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Registrar Nueva Mascota</h1>
        <p className="text-sm text-muted-foreground mt-1">El estado inicial será "{PET_STATUS.QUARANTINE.label}".</p>
      </div>
      <PetForm />
    </div>
  );
}
