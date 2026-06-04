import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PawPrint, UserPlus } from 'lucide-react';
import { apiClient } from '../lib/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FormField } from '../components/FormField';
import { getApiErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface RegisterResponse {
  success: boolean;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: 'ADOPTER';
  };
}

interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
    role: 'ADOPTER';
  };
}

export function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post<RegisterResponse>('/auth/register-adopter', {
        fullName,
        email,
        password,
        phone: phone.trim() || undefined,
      });

      const loginResponse = await apiClient.post<LoginResponse>('/auth/login', {
        email,
        password,
      });

      if (loginResponse.data.success) {
        login(loginResponse.data.token, loginResponse.data.user);
        setSuccessMessage('Cuenta creada correctamente.');
        navigate('/', { replace: true });
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'No se pudo crear la cuenta. Revisa los datos e intenta de nuevo.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg shadow-lg border-gray-200/80">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-11 h-11 bg-rescue-100 text-rescue-600 rounded-full flex items-center justify-center mb-3">
            <PawPrint className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl font-bold text-foreground">Crear cuenta</CardTitle>
          <CardDescription>Registra tus datos para solicitar adopciones.</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="p-3 bg-green-50 text-green-700 text-sm rounded-md border border-green-200">
                {successMessage}
              </div>
            )}

            <FormField
              label="Nombre completo"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Juan Perez"
              required
            />
            <FormField
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="juan@example.com"
              required
            />
            <FormField
              label="Teléfono (opcional)"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+506 8888 8888"
            />
            <FormField
              label="Contraseña"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
            <FormField
              label="Confirmar contraseña"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={6}
              required
            />
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              <UserPlus className="w-4 h-4" />
              {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
            <p className="text-center text-sm text-gray-500">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-rescue-600 font-medium hover:underline">
                Inicia sesión
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
