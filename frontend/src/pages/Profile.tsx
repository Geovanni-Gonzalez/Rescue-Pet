import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { apiClient } from '../lib/api';
import { Save, UserCircle, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { User } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Alert } from '../components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { FormField } from '../components/FormField';
import { RoleBadge } from '../components/RoleBadge';
import { LoadingState } from '../components/LoadingState';
import { getApiErrorMessage } from '../lib/api';

interface MeResponse {
  success: boolean;
  user: User;
}

interface UpdateUserResponse {
  success: boolean;
  user: User;
}

export function Profile() {
  const { user, updateUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
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
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [isSavingPwd, setIsSavingPwd] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiClient.get<MeResponse>('/auth/me');
        setCurrentUser(response.data.user);
        setFullName(response.data.user.fullName);
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
    setIsSaving(true);

    try {
      const response = await apiClient.patch<UpdateUserResponse>(`/users/${currentUser.id}`, {
        fullName,
        phone: phone.trim() || undefined,
      });

      const mergedUser = { ...currentUser, ...response.data.user };
      setCurrentUser(mergedUser);
      updateUser(mergedUser);
      setSuccessMessage('Perfil actualizado correctamente.');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'No se pudo actualizar tu perfil.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (event: FormEvent) => {
    event.preventDefault();
    setPwdError('');
    setPwdSuccess('');
    if (newPassword !== confirmPassword) {
      setPwdError('Las contraseñas nuevas no coinciden.');
      return;
    }
    setIsSavingPwd(true);
    try {
      await apiClient.put('/users/me/password', { currentPassword, newPassword });
      setPwdSuccess('Contraseña actualizada correctamente.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setPwdError(getApiErrorMessage(err, 'No se pudo actualizar la contraseña.'));
    } finally {
      setIsSavingPwd(false);
    }
  };

  if (isLoading) return <LoadingState message="Cargando perfil..." />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-rescue-100 text-rescue-600 rounded-xl flex items-center justify-center">
          <UserCircle className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
          <p className="text-gray-500">Administra tus datos basicos de contacto.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de cuenta</CardTitle>
          <CardDescription>El correo y el rol son gestionados por el sistema.</CardDescription>
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
                minLength={2}
                required
              />
              <FormField
                label="Telefono"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+506 8888 8888"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-sm text-gray-500">Correo electrónico</p>
                <p className="font-medium text-gray-900">{currentUser?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Rol</p>
                {currentUser?.role && <RoleBadge role={currentUser.role} />}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
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
            <Lock className="w-4 h-4 text-gray-500" />
            <CardTitle>Cambiar contraseña</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {pwdError && <Alert variant="danger" className="mb-4">{pwdError}</Alert>}
          {pwdSuccess && <Alert variant="success" className="mb-4">{pwdSuccess}</Alert>}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <FormField
              label="Contraseña actual"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Nueva contraseña"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                required
              />
              <FormField
                label="Confirmar contraseña"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
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
