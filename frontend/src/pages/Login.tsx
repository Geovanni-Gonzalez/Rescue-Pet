import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { PawPrint } from 'lucide-react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Alert } from '../components/ui/alert';
import { FormField } from '../components/FormField';
import { useAuth } from '../context/AuthContext';
import { apiClient, getApiErrorMessage, isNetworkError } from '../lib/api';
import loginFamilyPets from '../assets/login-family-pets.webp';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const resetSuccess = searchParams.get('reset') === 'ok';
  // CU-12 paso 10: mensaje de confirmación tras activar la cuenta.
  const activationMessage = (location.state as { activationMessage?: string } | null)?.activationMessage;

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setPendingVerification(false);
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
        // CU-12 7A: si la cuenta está pendiente de verificación, ofrecer el reenvío
        // del correo de activación desde la pantalla de inicio de sesión.
        if (axios.isAxiosError<{ code?: string }>(err) && err.response?.data?.code === 'PENDING_VERIFICATION') {
          setPendingVerification(true);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Brand panel */}
      <div
        className="hidden lg:flex lg:w-[45%] items-end p-12 pb-16 relative overflow-hidden bg-cover"
        style={{ backgroundImage: `url(${loginFamilyPets})`, backgroundPosition: '62% center' }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />
        <div className="relative z-10 max-w-sm text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white/20 ring-1 ring-white/25 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <PawPrint className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">Rescue Pet</span>
          </div>
          <p className="text-3xl font-bold text-white leading-tight">
            Cada adopción cambia dos vidas.
          </p>
          <p className="text-base font-medium text-white/90 mt-4 leading-relaxed">
            Conectamos refugios con familias que buscan un compañero.
          </p>
        </div>
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
            {activationMessage && (
              <Alert variant="success">{activationMessage}</Alert>
            )}
            {resetSuccess && (
              <Alert variant="success">Contraseña restablecida. Ya puedes iniciar sesión.</Alert>
            )}
            {error && (
              <Alert variant="danger">
                <p>{error}</p>
                {pendingVerification && (
                  <p className="mt-1 text-sm">
                    ¿No recibiste el correo o el enlace expiró?{' '}
                    <Link to="/resend-activation" className="font-medium underline">
                      Reenviar correo de activación
                    </Link>
                  </p>
                )}
              </Alert>
            )}

            <FormField
              label="Correo electrónico"
              type="email"
              placeholder="Ej. maria.lopez@correo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <div className="space-y-1">
              <FormField
                label="Contraseña"
                type="password"
                placeholder="Ingresa tu contraseña"
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
