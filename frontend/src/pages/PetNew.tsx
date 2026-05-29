import { PetForm } from '../components/PetForm';

export function PetNew() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Registrar Nueva Mascota</h1>
        <p className="text-gray-500">Ingresa los datos iniciales. El estado se asignará como "En Cuarentena" por defecto.</p>
      </div>
      <PetForm />
    </div>
  );
}
