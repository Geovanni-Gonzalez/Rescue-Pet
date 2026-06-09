import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, UserX, RefreshCw } from 'lucide-react';
import { apiClient, getApiErrorMessage } from '../lib/api';
import { Button } from '../components/ui/button';
import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { FormField } from '../components/FormField';
import { RoleBadge } from '../components/RoleBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import type { Role } from '../context/AuthContext';

interface UserRow {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: Role;
  status: string;
  createdAt: string;
}

const USER_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: 'Activo', className: 'bg-green-100 text-green-800 border-green-200' },
  INACTIVE: { label: 'Inactivo', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  PENDING_VERIFICATION: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  BLOCKED: { label: 'Bloqueado', className: 'bg-red-100 text-red-800 border-red-200' },
};

function UserStatusBadge({ status }: { status: string }) {
  const config = USER_STATUS_CONFIG[status] || { label: status, className: '' };
  return (
    <Badge variant="outline" className={`font-medium ${config.className}`}>
      {config.label}
    </Badge>
  );
}

const ROLE_LABELS: Record<string, string> = {
  VETERINARIAN: 'Veterinario',
  VOLUNTEER: 'Voluntario',
};

export function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', email: '', role: 'VETERINARIAN', phone: '' });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<UserRow | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await apiClient.get<{ users: UserRow[] }>('/users');
      setUsers(res.data.users);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudieron cargar los usuarios.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    try {
      await apiClient.post('/users', {
        fullName: formData.fullName,
        email: formData.email,
        role: formData.role,
        phone: formData.phone || undefined,
      });
      setShowForm(false);
      setFormData({ fullName: '', email: '', role: 'VETERINARIAN', phone: '' });
      fetchUsers();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'No se pudo crear el usuario.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await apiClient.patch(`/users/${deactivateTarget.id}/deactivate`);
      setDeactivateTarget(null);
      fetchUsers();
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo desactivar el usuario.'));
      setDeactivateTarget(null);
    }
  };

  if (isLoading) return <LoadingState message="Cargando usuarios..." />;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-500 text-sm mt-0.5">{users.length} usuarios registrados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsers} title="Actualizar">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="w-4 h-4" />
            Nuevo usuario
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4">{error}</Alert>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Crear usuario interno</CardTitle>
          </CardHeader>
          <CardContent>
            {formError && (
              <Alert variant="danger" className="mb-4">{formError}</Alert>
            )}
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Nombre completo"
                value={formData.fullName}
                onChange={(e) => setFormData((f) => ({ ...f, fullName: e.target.value }))}
                minLength={2}
                required
              />
              <FormField
                label="Correo electrónico"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                required
              />
              <FormField
                label="Teléfono (opcional)"
                value={formData.phone}
                onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+506 8888 8888"
              />
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Rol</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rescue-500"
                  value={formData.role}
                  onChange={(e) => setFormData((f) => ({ ...f, role: e.target.value }))}
                >
                  <option value="VETERINARIAN">Veterinario</option>
                  <option value="VOLUNTEER">Voluntario</option>
                </select>
              </div>
              <div className="md:col-span-2 flex gap-2 justify-end border-t pt-4">
                <Button variant="outline" type="button" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creando...' : `Crear ${ROLE_LABELS[formData.role] || formData.role}`}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="mt-4">
      {users.length === 0 ? (
        <EmptyState
          title="Sin usuarios"
          description="Crea el primer usuario del equipo para comenzar."
          action={
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-1" /> Nuevo usuario
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Usuario</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Rol</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">
                    Registrado
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{u.fullName}</div>
                      <div className="text-gray-400 text-xs">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3">
                      <UserStatusBadge status={u.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                      {new Date(u.createdAt).toLocaleDateString('es-CR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.status !== 'INACTIVE' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeactivateTarget(u)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Desactivar usuario"
                        >
                          <UserX className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      </div>

      <ConfirmDialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => { if (!open) setDeactivateTarget(null); }}
        title="Desactivar usuario"
        description={
          deactivateTarget
            ? `¿Seguro que deseas desactivar a ${deactivateTarget.fullName}? El usuario perderá acceso inmediatamente.`
            : ''
        }
        onConfirm={handleDeactivate}
        variant="destructive"
        confirmText="Desactivar"
      />
    </div>
  );
}
