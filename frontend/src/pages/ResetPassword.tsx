import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { PawPrint } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FormField } from '../components/FormField';
import { apiClient, getApiErrorMessage } from '../lib/api';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { token, password });
      navigate('/login?reset=ok');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'No se pudo restablecer la contraseña. El enlace puede haber expirado.'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">Enlace inválido o incompleto.</p>
          <Link to="/forgot-password" className="text-rescue-600 font-medium hover:underline">
            Solicitar un nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
      <Card className="w-full max-w-md shadow-lg border-rescue-100">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-12 h-12 bg-rescue-100 text-rescue-600 rounded-full flex items-center justify-center mb-4">
            <PawPrint className="w-7 h-7" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Nueva contraseña</CardTitle>
          <CardDescription>Elige una contraseña segura de al menos 8 caracteres.</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">{error}</div>
            )}
            <FormField
              label="Nueva contraseña"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <FormField
              label="Confirmar contraseña"
              type="password"
              placeholder="Repite la contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              required
            />
          </CardContent>
          <CardFooter className="pt-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Cambiar contraseña'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
