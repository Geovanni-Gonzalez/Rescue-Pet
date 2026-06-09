import { PetForm } from '../components/PetForm';

export function PetNew() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Registrar Nueva Mascota</h1>
        <p className="text-sm text-muted-foreground mt-1">El estado inicial será "En Cuarentena".</p>
      </div>
      <PetForm />
    </div>
  );
}
