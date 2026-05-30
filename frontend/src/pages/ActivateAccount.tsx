import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PawPrint, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { apiClient } from '../lib/api';

type Status = 'loading' | 'success' | 'expired' | 'error';

export function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de activación no encontrado en el enlace.');
      return;
    }

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
      <Card className="w-full max-w-md shadow-lg border-rescue-100 text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto w-12 h-12 bg-rescue-100 text-rescue-600 rounded-full flex items-center justify-center mb-4">
            <PawPrint className="w-7 h-7" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Activación de cuenta</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 pb-6">
          {status === 'loading' && (
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Verificando tu cuenta...</span>
            </div>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
              <p className="text-green-700 font-medium">{message}</p>
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
