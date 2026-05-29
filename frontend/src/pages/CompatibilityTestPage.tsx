import { useState, useEffect } from 'react';
import { CompatibilityTestForm } from '../components/CompatibilityTestForm';
import { LoadingState } from '../components/LoadingState';
import { ClipboardList, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import axios from 'axios';
import type { CompatibilityTestData } from '../components/CompatibilityTestForm';

export function CompatibilityTestPage() {
  const [initialData, setInitialData] = useState<CompatibilityTestData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const res = await axios.get('http://localhost:3000/matchmaking/test/me');
        if (res.data.test) setInitialData(res.data.test);
      } catch {
        // Sin test previo
      } finally {
        setIsLoading(false);
      }
    };
    fetchTest();
  }, []);

  if (isLoading) return <LoadingState />;

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto mt-20 flex flex-col items-center text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">¡Test completado!</h2>
        <p className="text-gray-500">Hemos calculado la afinidad con todas las mascotas disponibles. Ahora verás el catálogo ordenado especialmente para ti.</p>
        <Button onClick={() => navigate('/catalog')} size="lg">
          Ver mi Catálogo Personalizado
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-rescue-100 text-rescue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <ClipboardList className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test de Afinidad</h1>
          <p className="text-gray-500">
            {initialData 
              ? 'Actualiza tu perfil para recalcular la compatibilidad con las mascotas actuales.'
              : 'Cuéntanos sobre ti y tu estilo de vida. Analizaremos a todas las mascotas disponibles para recomendarte al compañero ideal.'}
          </p>
        </div>
      </div>
      <CompatibilityTestForm initialData={initialData} onSubmitted={() => setSubmitted(true)} />
    </div>
  );
}
