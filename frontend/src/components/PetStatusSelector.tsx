import React, { useState } from 'react';
import type { PetStatus } from './StatusBadge';
import { Button } from './ui/button';
import { Label } from './ui/label';
import axios from 'axios';

interface PetStatusSelectorProps {
  petId: string;
  currentStatus: PetStatus;
  onStatusChanged: (newStatus: PetStatus) => void;
}

export function PetStatusSelector({ petId, currentStatus, onStatusChanged }: PetStatusSelectorProps) {
  const [selectedStatus, setSelectedStatus] = useState<PetStatus>(currentStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Lógica de transición de máquina de estados permitida
  const getAllowedTransitions = (status: PetStatus): { value: PetStatus, label: string }[] => {
    const options = [
      { value: 'QUARANTINE', label: 'En Cuarentena' },
      { value: 'AVAILABLE', label: 'Disponible' },
      { value: 'TREATMENT', label: 'En Tratamiento' },
      { value: 'ADOPTED', label: 'Adoptado' },
      { value: 'DECEASED', label: 'Fallecido' },
    ] as { value: PetStatus, label: string }[];

    if (status === 'QUARANTINE') return options.filter(o => ['AVAILABLE', 'TREATMENT'].includes(o.value));
    if (status === 'AVAILABLE') return options.filter(o => ['TREATMENT', 'ADOPTED'].includes(o.value));
    if (status === 'TREATMENT') return options.filter(o => ['AVAILABLE', 'DECEASED'].includes(o.value));
    return []; // ADOPTED y DECEASED son terminales
  };

  const allowedTransitions = getAllowedTransitions(currentStatus);
  const isTerminal = allowedTransitions.length === 0;

  const handleUpdate = async () => {
    if (selectedStatus === currentStatus) return;
    
    setIsLoading(true);
    setError('');
    try {
      await axios.patch(`http://localhost:3000/pets/${petId}/status`, { status: selectedStatus });
      onStatusChanged(selectedStatus);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al actualizar el estado');
    } finally {
      setIsLoading(false);
    }
  };

  if (isTerminal) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-500 text-center">Esta mascota está en un estado terminal y no puede cambiar su estado médico o de adopción.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-white">
      <div>
        <Label>Actualizar Estado</Label>
        <p className="text-xs text-gray-500 mb-2">Selecciona el nuevo estado según la evaluación clínica o proceso de adopción.</p>
        
        <div className="flex gap-2">
          <select 
            className="flex-1 h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as PetStatus)}
          >
            <option value={currentStatus} disabled>Actual: {currentStatus}</option>
            {allowedTransitions.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <Button 
            onClick={handleUpdate} 
            disabled={isLoading || selectedStatus === currentStatus}
          >
            Guardar
          </Button>
        </div>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>
    </div>
  );
}
