import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PawPrint } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FormField } from '../components/FormField';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../context/AuthContext';
import { apiClient, getApiErrorMessage, isNetworkError } from '../lib/api';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/login', { email, password });

      if (response.data.success) {
        login(response.data.token, response.data.user);
        navigate('/', { replace: true });
      }
    } catch (err: unknown) {
      console.error(err);

      if (isNetworkError(err)) {
        const mockUser = {
          id: 'mock-1',
          fullName: 'Usuario Demo (Mock)',
          email,
          role: email.includes('admin')
            ? 'ADMIN'
            : email.includes('vet')
              ? 'VETERINARIAN'
              : email.includes('vol')
                ? 'VOLUNTEER'
                : 'ADOPTER' as Role,
        };
        login('mock-token-123', mockUser);
        navigate('/', { replace: true });
      } else {
        setError(getApiErrorMessage(err, 'Error al iniciar sesion. Verifica tus credenciales.'));
      }
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
          <CardTitle className="text-2xl font-bold text-gray-900">Rescue Pet</CardTitle>
          <CardDescription>Inicia sesion para acceder al sistema</CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
                {error}
              </div>
            )}

            <FormField
              label="Correo electronico"
              type="email"
              placeholder="ejemplo@correo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <FormField
              label="Contrasena"
              type="password"
              placeholder="********"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Iniciando sesion...' : 'Ingresar'}
            </Button>

            <div className="text-center text-sm text-gray-500">
              No tienes cuenta?{' '}
              <Link to="/register" className="text-rescue-600 font-medium hover:underline">
                Registrate como adoptante
              </Link>
            </div>
            <div className="text-center text-xs text-gray-400 mt-4 border-t pt-4">
              Tip (Prototipo): Usa 'admin@...', 'vet@...', 'vol@...' para probar distintos roles si el backend esta apagado.
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
