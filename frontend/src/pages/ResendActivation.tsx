import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PawPrint } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert } from '../components/ui/alert';
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
      setError(getApiErrorMessage(err, 'No se pudo procesar la solicitud.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-lg border-border">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-11 h-11 bg-rescue-100 text-rescue-600 rounded-full flex items-center justify-center mb-3">
            <PawPrint className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl font-bold text-foreground">Reenviar activación</CardTitle>
          <CardDescription>Te enviaremos un nuevo enlace de activación.</CardDescription>
        </CardHeader>

        {message ? (
          <CardContent className="space-y-4">
            <Alert variant="success">{message}</Alert>
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
                <Alert variant="danger">{error}</Alert>
              )}
              <FormField
                label="Correo electrónico"
                type="email"
                placeholder="Ej. maria.lopez@correo.com"
                helperText="Usa el correo con el que creaste tu cuenta de adoptante."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-2">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Enviando...' : 'Reenviar enlace'}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
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
