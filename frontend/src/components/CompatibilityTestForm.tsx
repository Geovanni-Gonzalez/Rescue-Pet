import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Button } from './ui/button';
import { FormField } from './FormField';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../lib/api';

export interface CompatibilityTestData {
  housingType: string;
  hasYard: boolean;
  childrenCount: number;
  hasOtherPets: boolean;
  dailyAvailableTime: number;
  allergies: string;
  experienceLevel: string;
}

interface CompatibilityTestFormProps {
  initialData?: Partial<CompatibilityTestData> | null;
  onSubmitted?: () => void;
}

export function CompatibilityTestForm({ initialData, onSubmitted }: CompatibilityTestFormProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    housingType: initialData?.housingType || 'HOUSE',
    hasYard: initialData?.hasYard || false,
    childrenCount: initialData?.childrenCount || 0,
    hasOtherPets: initialData?.hasOtherPets || false,
    dailyAvailableTime: initialData?.dailyAvailableTime || 2,
    allergies: initialData?.allergies || '',
    experienceLevel: initialData?.experienceLevel || 'BEGINNER',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await axios.post('http://localhost:3000/matchmaking/test', formData);
      if (onSubmitted) {
        onSubmitted();
      } else {
        navigate('/catalog');
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Error al guardar el test'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      {error && <div className="p-3 bg-red-50 text-red-600 rounded">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo de Vivienda</label>
          <select name="housingType" value={formData.housingType} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="HOUSE">Casa</option>
            <option value="APARTMENT">Departamento</option>
          </select>
        </div>

        <div className="flex items-center space-x-2 h-10 mt-6">
          <input type="checkbox" id="hasYard" name="hasYard" checked={formData.hasYard} onChange={handleChange} className="w-4 h-4 text-rescue-600 rounded border-gray-300" />
          <label htmlFor="hasYard" className="text-sm font-medium">¿Tienes patio asegurado?</label>
        </div>

        <FormField label="Cantidad de niños en casa" name="childrenCount" type="number" min={0} value={formData.childrenCount} onChange={handleChange} />

        <div className="flex items-center space-x-2 h-10 mt-6">
          <input type="checkbox" id="hasOtherPets" name="hasOtherPets" checked={formData.hasOtherPets} onChange={handleChange} className="w-4 h-4 text-rescue-600 rounded border-gray-300" />
          <label htmlFor="hasOtherPets" className="text-sm font-medium">¿Tienes otras mascotas?</label>
        </div>

        <FormField label="Horas libres al día (aprox)" name="dailyAvailableTime" type="number" min={0} value={formData.dailyAvailableTime} onChange={handleChange} />

        <div className="space-y-2">
          <label className="text-sm font-medium">Experiencia con mascotas</label>
          <select name="experienceLevel" value={formData.experienceLevel} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="NONE">Ninguna</option>
            <option value="BEGINNER">Principiante</option>
            <option value="EXPERIENCED">Experimentado</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <FormField label="Alergias conocidas (opcional)" name="allergies" value={formData.allergies} onChange={handleChange} placeholder="Ej: Pelo de gato" />
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100 flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Calculando afinidad...' : 'Guardar y Ver Resultados'}
        </Button>
      </div>
    </form>
  );
}
