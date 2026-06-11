import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { PawPrint, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { apiClient } from '../lib/api';

type Status = 'loading' | 'success' | 'expired' | 'error';

export function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  // La activación consume el token (no es idempotente): evita el doble disparo
  // del efecto en StrictMode/remontajes, que mostraría "token inválido" tras activar.
  const requestedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de activación no encontrado en el enlace.');
      return;
    }

    if (requestedTokenRef.current === token) return;
    requestedTokenRef.current = token;

    apiClient
      .get<{ message: string }>(`/auth/activate?token=${encodeURIComponent(token)}`)
      .then((res) => {
        setMessage(res.data.message || 'Cuenta activada.');
        setStatus('success');
      })
      .catch((err) => {
        const code = err?.response?.data?.code;
        const errorMsg = err?.response?.data?.error || 'El enlace de activación es inválido o ha expirado.';
        setMessage(errorMsg);
        setStatus(code === 'TOKEN_EXPIRED' ? 'expired' : 'error');
      });
  }, [token]);

  // CU-12 paso 10: tras activar, redirigir al inicio de sesión con el mensaje
  // de confirmación (aplica igual en móvil — la pantalla es responsive, 8A).
  useEffect(() => {
    if (status !== 'success') return;
    const timer = setTimeout(() => {
      navigate('/login', { state: { activationMessage: message || 'Cuenta activada correctamente. Ya puedes iniciar sesión.' } });
    }, 2500);
    return () => clearTimeout(timer);
  }, [status, message, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-lg border-border text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto w-11 h-11 bg-rescue-100 text-rescue-600 rounded-full flex items-center justify-center mb-3">
            <PawPrint className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl font-bold text-foreground">Activación de cuenta</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 pb-6">
          {status === 'loading' && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Verificando tu cuenta...</span>
            </div>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
              <p className="text-green-700 font-medium">{message}</p>
              <p className="text-sm text-muted-foreground">Te llevaremos al inicio de sesión en unos segundos...</p>
              <Button asChild className="w-full mt-2">
                <Link to="/login">Ir al inicio de sesión</Link>
              </Button>
            </>
          )}

          {(status === 'expired' || status === 'error') && (
            <>
              <XCircle className="w-14 h-14 text-red-500 mx-auto" />
              <p className="text-red-600">{message}</p>
              <div className="flex flex-col gap-2 mt-2">
                {status === 'expired' && (
                  <Button asChild className="w-full">
                    <Link to="/resend-activation">Solicitar nuevo enlace</Link>
                  </Button>
                )}
                <Button asChild variant="outline" className="w-full">
                  <Link to="/login">Volver al inicio</Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
