import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PawPrint } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FormField } from '../components/FormField';
import { apiClient, getApiErrorMessage } from '../lib/api';

export function ResendActivation() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);
    try {
      const res = await apiClient.post<{ message: string }>('/auth/resend-activation', { email });
      setMessage(res.data.message);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Error al procesar la solicitud.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
      <Card className="w-full max-w-md shadow-lg border-rescue-100">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-12 h-12 bg-rescue-100 text-rescue-600 rounded-full flex items-center justify-center mb-4">
            <PawPrint className="w-7 h-7" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Reenviar activación</CardTitle>
          <CardDescription>Ingresa tu correo para recibir un nuevo enlace de activación.</CardDescription>
        </CardHeader>

        {message ? (
          <CardContent className="space-y-4">
            <div className="p-3 bg-green-50 text-green-700 text-sm rounded-md border border-green-200">
              {message}
            </div>
            <div className="text-center text-sm">
              <Link to="/login" className="text-rescue-600 font-medium hover:underline">
                Volver al inicio de sesión
              </Link>
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">{error}</div>
              )}
              <FormField
                label="Correo electrónico"
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-2">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Enviando...' : 'Reenviar enlace'}
              </Button>
              <div className="text-center text-sm text-gray-500">
                <Link to="/login" className="text-rescue-600 font-medium hover:underline">
                  Volver al inicio de sesión
                </Link>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
