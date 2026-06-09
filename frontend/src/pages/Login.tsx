import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PawPrint } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Alert } from '../components/ui/alert';
import { FormField } from '../components/FormField';
import { useAuth } from '../context/AuthContext';
import { apiClient, getApiErrorMessage, isNetworkError } from '../lib/api';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetSuccess = searchParams.get('reset') === 'ok';

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
      if (isNetworkError(err)) {
        setError('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
      } else {
        setError(getApiErrorMessage(err, 'Correo o contraseña incorrectos.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-primary items-end p-12 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
              <PawPrint className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-primary-foreground">Rescue Pet</span>
          </div>
          <p className="text-2xl font-bold text-primary-foreground leading-snug max-w-xs">
            Cada adopción cambia dos vidas.
          </p>
          <p className="text-sm text-primary-foreground/70 mt-3 max-w-xs">
            Conectamos refugios con familias que buscan un compañero.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary-foreground/5 -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-primary-foreground/5 translate-y-1/4 -translate-x-1/4" />
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm" style={{ animation: 'stagger-fade-in 500ms var(--ease-out) both' }}>
          {/* Mobile brand mark */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-rescue-100 text-rescue-600 rounded-xl flex items-center justify-center">
              <PawPrint className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold text-foreground">Rescue Pet</span>
          </div>

          <h1 className="text-2xl font-bold text-foreground">Iniciar sesión</h1>
          <p className="text-sm text-muted-foreground mt-1 mb-6">Ingresa tus credenciales para continuar.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            {resetSuccess && (
              <Alert variant="success">Contraseña restablecida. Ya puedes iniciar sesión.</Alert>
            )}
            {error && <Alert variant="danger">{error}</Alert>}

            <FormField
              label="Correo electrónico"
              type="email"
              placeholder="ejemplo@correo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <div className="space-y-1">
              <FormField
                label="Contraseña"
                type="password"
                placeholder="********"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <div className="text-right">
                <Link to="/forgot-password" className="text-xs text-rescue-600 hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="text-rescue-600 font-medium hover:underline">
                Regístrate
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
