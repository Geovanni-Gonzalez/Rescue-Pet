import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PawPrint, UserPlus, MailCheck } from 'lucide-react';
import { apiClient } from '../lib/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert } from '../components/ui/alert';
import { FormField } from '../components/FormField';
import { PasswordRequirementsList } from '../components/PasswordRequirementsList';
import { getUnmetRequirements } from '../lib/passwordPolicy';
import { getApiErrorMessage } from '../lib/api';

interface RegisterResponse {
  success: boolean;
  emailSent?: boolean;
  message?: string;
}

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Estado tras un registro exitoso (CU-12 paso 7): instrucciones de activación.
  const [registered, setRegistered] = useState<{ message: string; emailSent: boolean } | null>(null);

  // CU-12 4E: validación por campo con mensajes descriptivos específicos.
  const validateFields = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = 'Ingresa tu nombre completo (mínimo 2 caracteres).';
    }
    if (!email.trim()) {
      errors.email = 'El correo electrónico es obligatorio.';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'El correo electrónico no tiene un formato válido.';
    }
    if (getUnmetRequirements(password).length > 0) {
      errors.password = 'La contraseña no cumple los requisitos de seguridad indicados abajo.';
    }
    if (confirmPassword !== password || !confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden.';
    }
    return errors;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    const errors = validateFields();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);

    try {
      const response = await apiClient.post<RegisterResponse>('/auth/register-adopter', {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
      });

      // CU-12 pasos 6-7: la cuenta queda pendiente de verificación; el actor debe
      // activar desde su correo. Si el envío falló (7E), se le informa y puede
      // reintentar desde la pantalla de inicio de sesión.
      setRegistered({
        message: response.data.message || 'Cuenta creada. Revisa tu correo para activarla.',
        emailSent: response.data.emailSent !== false,
      });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'No se pudo crear la cuenta. Revisa los datos e intenta de nuevo.'));
    } finally {
      setIsLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg border-border text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto w-11 h-11 bg-rescue-100 text-rescue-600 rounded-full flex items-center justify-center mb-3">
              <MailCheck className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">Revisa tu correo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            {registered.emailSent ? (
              <>
                <Alert variant="success">{registered.message}</Alert>
                <p className="text-sm text-muted-foreground">
                  Te enviamos un enlace de activación a <span className="font-medium text-foreground">{email}</span>.
                  El enlace expira en 24 horas. Si no lo encuentras, revisa la carpeta de spam.
                </p>
              </>
            ) : (
              <Alert variant="danger">{registered.message}</Alert>
            )}
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link to="/login">Ir al inicio de sesión</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/resend-activation">Reenviar correo de activación</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg shadow-lg border-border" style={{ animation: 'stagger-fade-in 500ms var(--ease-out) both' }}>
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-11 h-11 bg-rescue-100 text-rescue-600 rounded-full flex items-center justify-center mb-3">
            <PawPrint className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl font-bold text-foreground">Crear cuenta</CardTitle>
          <CardDescription>
            Regístrate como adoptante. Recibirás un correo para activar tu cuenta.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit} noValidate>
          <CardContent className="space-y-4">
            {error && <Alert variant="danger">{error}</Alert>}

            <FormField
              label="Nombre completo"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Juan Perez"
              error={fieldErrors.fullName}
              required
            />
            <FormField
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="juan@example.com"
              error={fieldErrors.email}
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
              error={fieldErrors.password}
              required
            />
            {/* CU-12 4.1E: criterios de la contraseña en tiempo real mientras se escribe. */}
            <PasswordRequirementsList password={password} />
            <FormField
              label="Confirmar contraseña"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              error={
                fieldErrors.confirmPassword ||
                (confirmPassword && confirmPassword !== password ? 'Las contraseñas no coinciden.' : undefined)
              }
              required
            />
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              <UserPlus className="w-4 h-4" />
              {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
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
