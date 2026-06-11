import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { Save, UserCircle, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { User, Role } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Alert } from '../components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { FormField } from '../components/FormField';
import { PasswordRequirementsList } from '../components/PasswordRequirementsList';
import { getUnmetRequirements } from '../lib/passwordPolicy';
import { LoadingState } from '../components/LoadingState';
import { getApiErrorMessage } from '../lib/api';
import axios from 'axios';

interface MeResponse {
  success: boolean;
  user: User;
}

interface UpdateUserResponse {
  success: boolean;
  user: User;
}

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  VETERINARIAN: 'Veterinario',
  VOLUNTEER: 'Voluntario',
  ADOPTER: 'Adoptante',
};

function getPasswordErrorDetails(error: unknown): string[] {
  if (axios.isAxiosError<{ details?: unknown }>(error) && Array.isArray(error.response?.data?.details)) {
    return error.response.data.details.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

export function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentUser, setCurrentUser] = useState<User | null>(user);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdErrorDetails, setPwdErrorDetails] = useState<string[]>([]);
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [isSavingPwd, setIsSavingPwd] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiClient.get<MeResponse>('/auth/me');
        setCurrentUser(response.data.user);
        setFullName(response.data.user.fullName);
        setEmail(response.data.user.email);
        setPhone(response.data.user.phone || '');
        updateUser(response.data.user);
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'No se pudo cargar tu perfil.'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [updateUser]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;

    setError('');
    setSuccessMessage('');

    // CU-10: los campos obligatorios no pueden quedar vacíos.
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setError('Nombre completo, correo electrónico y teléfono son obligatorios.');
      return;
    }

    setIsSaving(true);

    try {
      const response = await apiClient.put<UpdateUserResponse>('/users/me', {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });

      const mergedUser = { ...currentUser, ...response.data.user };
      setCurrentUser(mergedUser);
      updateUser(mergedUser);
      setEmail(mergedUser.email);
      setSuccessMessage('Perfil actualizado correctamente.');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'No se pudo actualizar tu perfil.'));
    } finally {
      setIsSaving(false);
    }
  };

  const unmetRequirements = getUnmetRequirements(newPassword);

  const handlePasswordChange = async (event: FormEvent) => {
    event.preventDefault();
    setPwdError('');
    setPwdErrorDetails([]);
    setPwdSuccess('');

    if (newPassword !== confirmPassword) {
      setPwdError('Las contraseñas nuevas no coinciden.');
      return;
    }
    // CU-10 4E2: bloquear el guardado mostrando los requisitos no cumplidos.
    if (unmetRequirements.length > 0) {
      setPwdError('La nueva contraseña no cumple los requisitos de seguridad.');
      setPwdErrorDetails(unmetRequirements.map((req) => req.label));
      return;
    }

    setIsSavingPwd(true);
    try {
      await apiClient.put('/users/me/password', { currentPassword, newPassword });
      setPwdSuccess('Contraseña actualizada. Por seguridad se cerrarán todas tus sesiones; inicia sesión nuevamente.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // CU-10 3A: el cambio invalida todas las sesiones activas, incluida esta.
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2500);
    } catch (err: unknown) {
      setPwdError(getApiErrorMessage(err, 'No se pudo actualizar la contraseña.'));
      setPwdErrorDetails(getPasswordErrorDetails(err));
    } finally {
      setIsSavingPwd(false);
    }
  };

  if (isLoading) return <LoadingState message="Cargando perfil..." />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        {currentUser?.photoUrl ? (
          <img
            src={currentUser.photoUrl}
            alt={`Fotografía de ${currentUser.fullName}`}
            className="w-12 h-12 rounded-xl object-cover border border-border"
          />
        ) : (
          <div className="w-12 h-12 bg-rescue-100 text-rescue-600 rounded-xl flex items-center justify-center">
            <UserCircle className="w-7 h-7" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>
          <p className="text-muted-foreground">Administra tus datos de contacto.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de cuenta</CardTitle>
          <CardDescription>
            Puedes actualizar tu nombre, correo electrónico y teléfono. El rol solo puede modificarlo un administrador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
          {successMessage && <Alert variant="success" className="mb-4">{successMessage}</Alert>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Nombre completo"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Ej. Maria Fernanda Lopez"
                helperText="Nombre visible para comunicaciones y registros internos."
                minLength={2}
                required
              />
              <FormField
                label="Teléfono"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Ej. +506 8888 8888"
                helperText="Incluye código de país para facilitar el contacto."
                minLength={7}
                required
              />
              <FormField
                label="Correo electrónico"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Ej. maria.lopez@correo.com"
                required
              />
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground" htmlFor="profile-role">
                  Rol
                </label>
                {/* CU-10 3E: el campo de rol se muestra deshabilitado para el propio usuario. */}
                <select
                  id="profile-role"
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-muted text-muted-foreground cursor-not-allowed"
                  value={currentUser?.role}
                  disabled
                  title="Solo un administrador puede modificar tu rol."
                >
                  {currentUser?.role && (
                    <option value={currentUser.role}>{ROLE_LABELS[currentUser.role] || currentUser.role}</option>
                  )}
                </select>
                <p className="text-xs text-muted-foreground">Solo un administrador puede modificar tu rol.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <Button type="submit" disabled={isSaving}>
                <Save className="w-4 h-4" />
                {isSaving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {/* Change password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <CardTitle>Cambiar contraseña</CardTitle>
          </div>
          <CardDescription>
            Al cambiar tu contraseña se cerrarán todas tus sesiones activas y deberás iniciar sesión de nuevo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pwdError && (
            <Alert variant="danger" className="mb-4">
              <p>{pwdError}</p>
              {pwdErrorDetails.length > 0 && (
                <ul className="list-disc pl-5 mt-1 text-sm">
                  {pwdErrorDetails.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              )}
            </Alert>
          )}
          {pwdSuccess && <Alert variant="success" className="mb-4">{pwdSuccess}</Alert>}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <FormField
              label="Contraseña actual"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Ingresa tu contraseña actual"
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Nueva contraseña"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                placeholder="Crea una nueva contraseña segura"
                required
              />
              <FormField
                label="Confirmar contraseña"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                placeholder="Repite la nueva contraseña"
                required
              />
            </div>

            {/* CU-10 4E2: requisitos de la política de seguridad en vivo. */}
            <PasswordRequirementsList password={newPassword} />

            <div className="pt-2 flex justify-end">
              <Button type="submit" variant="outline" disabled={isSavingPwd}>
                <Lock className="w-4 h-4" />
                {isSavingPwd ? 'Guardando...' : 'Actualizar contraseña'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
