import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, UserX, UserCheck, RefreshCw, Pencil } from 'lucide-react';
import { apiClient, getApiErrorMessage } from '../lib/api';
import { Button } from '../components/ui/button';
import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { FormField } from '../components/FormField';
import { RoleBadge } from '../components/RoleBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
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
  INACTIVE: { label: 'Inactivo', className: 'bg-muted text-muted-foreground border-border' },
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
  ADMIN: 'Administrador',
  VETERINARIAN: 'Veterinario',
  VOLUNTEER: 'Voluntario',
  ADOPTER: 'Adoptante',
};

const ALL_ROLES: Role[] = ['ADMIN', 'VETERINARIAN', 'VOLUNTEER', 'ADOPTER'];

interface EditFormState {
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  status: string;
}

export function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', email: '', role: 'VETERINARIAN', phone: '' });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<UserRow | null>(null);

  // Edit dialog state (CU-10: el Administrador modifica perfiles y asigna roles)
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [editData, setEditData] = useState<EditFormState | null>(null);
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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

  const handleReactivate = async (target: UserRow) => {
    setError('');
    try {
      await apiClient.patch(`/users/${target.id}`, { status: 'ACTIVE' });
      fetchUsers();
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo reactivar el usuario.'));
    }
  };

  const openEdit = (target: UserRow) => {
    setEditTarget(target);
    setEditError('');
    setEditData({
      fullName: target.fullName,
      email: target.email,
      phone: target.phone || '',
      role: target.role,
      status: target.status,
    });
  };

  const closeEdit = () => {
    setEditTarget(null);
    setEditData(null);
    setEditError('');
  };

  const isEditingSelf = Boolean(editTarget && currentUser && editTarget.id === currentUser.id);

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editTarget || !editData) return;

    setEditError('');
    if (!editData.fullName.trim() || !editData.email.trim()) {
      setEditError('El nombre completo y el correo electrónico son obligatorios.');
      return;
    }

    const payload: Record<string, string> = {
      fullName: editData.fullName.trim(),
      email: editData.email.trim(),
    };
    if (editData.phone.trim()) payload.phone = editData.phone.trim();
    // El rol y el estado del propio administrador no se envían (salvaguarda de bloqueo).
    if (!isEditingSelf) {
      if (editData.role !== editTarget.role) payload.role = editData.role;
      if (editData.status !== editTarget.status) payload.status = editData.status;
    }

    setIsSavingEdit(true);
    try {
      await apiClient.patch(`/users/${editTarget.id}`, payload);
      closeEdit();
      fetchUsers();
    } catch (err) {
      setEditError(getApiErrorMessage(err, 'No se pudo actualizar el usuario.'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (isLoading) return <LoadingState message="Cargando usuarios..." />;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{users.length} usuarios registrados</p>
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
                <label className="block text-sm font-medium text-foreground">Rol</label>
                <select
                  className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rescue-500"
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
              <thead className="bg-muted border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Usuario</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rol</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                    Registrado
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{u.fullName}</div>
                      <div className="text-muted-foreground text-xs">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3">
                      <UserStatusBadge status={u.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {new Date(u.createdAt).toLocaleDateString('es-CR')}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(u)}
                        title="Editar usuario"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {u.status === 'INACTIVE' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReactivate(u)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="Reactivar usuario"
                        >
                          <UserCheck className="w-4 h-4" />
                        </Button>
                      ) : (
                        currentUser?.id !== u.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeactivateTarget(u)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Desactivar usuario"
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        )
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

      {/* CU-10: edición de perfil y asignación de rol por el Administrador */}
      <Dialog open={editTarget !== null} onOpenChange={(open) => { if (!open) closeEdit(); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription>
              Actualiza los datos de contacto, el rol o el estado de la cuenta.
            </DialogDescription>
          </DialogHeader>

          {editError && <Alert variant="danger" className="mb-2">{editError}</Alert>}

          {editData && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <FormField
                label="Nombre completo"
                value={editData.fullName}
                onChange={(e) => setEditData((d) => (d ? { ...d, fullName: e.target.value } : d))}
                minLength={2}
                required
              />
              <FormField
                label="Correo electrónico"
                type="email"
                value={editData.email}
                onChange={(e) => setEditData((d) => (d ? { ...d, email: e.target.value } : d))}
                required
              />
              <FormField
                label="Teléfono"
                value={editData.phone}
                onChange={(e) => setEditData((d) => (d ? { ...d, phone: e.target.value } : d))}
                placeholder="+506 8888 8888"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground" htmlFor="edit-role">Rol</label>
                  <select
                    id="edit-role"
                    className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rescue-500 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                    value={editData.role}
                    onChange={(e) => setEditData((d) => (d ? { ...d, role: e.target.value as Role } : d))}
                    disabled={isEditingSelf}
                    title={isEditingSelf ? 'No puedes cambiar tu propio rol.' : undefined}
                  >
                    {ALL_ROLES.map((role) => (
                      <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                    ))}
                  </select>
                  {isEditingSelf && (
                    <p className="text-xs text-muted-foreground">No puedes cambiar tu propio rol.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground" htmlFor="edit-status">Estado</label>
                  <select
                    id="edit-status"
                    className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rescue-500 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                    value={editData.status}
                    onChange={(e) => setEditData((d) => (d ? { ...d, status: e.target.value } : d))}
                    disabled={isEditingSelf}
                    title={isEditingSelf ? 'No puedes desactivar tu propia cuenta.' : undefined}
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                    {!['ACTIVE', 'INACTIVE'].includes(editData.status) && (
                      <option value={editData.status}>
                        {USER_STATUS_CONFIG[editData.status]?.label || editData.status}
                      </option>
                    )}
                  </select>
                </div>
              </div>
              <DialogFooter className="mt-2">
                <Button variant="outline" type="button" onClick={closeEdit}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSavingEdit}>
                  {isSavingEdit ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => { if (!open) setDeactivateTarget(null); }}
        title="Desactivar usuario"
        description={
          deactivateTarget
            ? `¿Seguro que deseas desactivar a ${deactivateTarget.fullName}? El usuario no podrá iniciar sesión, pero sus datos históricos se conservarán.`
            : ''
        }
        onConfirm={handleDeactivate}
        variant="destructive"
        confirmText="Desactivar"
      />
    </div>
  );
}
