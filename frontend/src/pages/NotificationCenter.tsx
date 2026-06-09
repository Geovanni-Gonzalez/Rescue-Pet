import { useState, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, Trash2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Alert } from '../components/ui/alert';
import { Card, CardContent } from '../components/ui/card';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { apiClient, getApiErrorMessage } from '../lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  resourceType?: string;
  resourceId?: string;
  readAt: string | null;
  createdAt: string;
}

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  INFO: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  WARNING: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  SUCCESS: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  ERROR: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterUnread, setFilterUnread] = useState(false);
  const limit = 20;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filterUnread) params.set('unread', 'true');
      const res = await apiClient.get(`/notifications?${params}`);
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
      setTotal(res.data.total);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error al cargar notificaciones'));
    } finally {
      setIsLoading(false);
    }
  }, [page, filterUnread]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error'));
    }
  };

  const markAllRead = async () => {
    try {
      await apiClient.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error'));
    }
  };

  const deleteNotif = async (id: string, wasUnread: boolean) => {
    try {
      await apiClient.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotal((t) => t - 1);
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error'));
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (isLoading && page === 1) return <LoadingState />;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-6 h-6 text-rescue-600" />
            Centro de Notificaciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todas leídas'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={filterUnread ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setFilterUnread(!filterUnread); setPage(1); }}
          >
            <Filter className="w-4 h-4 mr-1" />
            {filterUnread ? 'Sin leer' : 'Todas'}
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheck className="w-4 h-4 mr-1" /> Leer todo
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="danger">{error}</Alert>
      )}

      {notifications.length === 0 ? (
        <EmptyState
          title={filterUnread ? 'Sin notificaciones pendientes' : 'Sin notificaciones'}
          description={filterUnread ? 'No tienes notificaciones sin leer.' : 'Aún no tienes notificaciones.'}
          icon={<Bell className="w-8 h-8" />}
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const style = TYPE_STYLES[n.type] || TYPE_STYLES['INFO'];
            return (
              <Card key={n.id} className={!n.readAt ? 'bg-rescue-50/30' : ''}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                          {n.type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(n.createdAt).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {!n.readAt && (
                          <span className="w-2 h-2 bg-rescue-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm font-semibold text-foreground">{n.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!n.readAt && (
                        <Button variant="ghost" size="sm" onClick={() => markRead(n.id)} title="Marcar como leída">
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => deleteNotif(n.id, !n.readAt)} title="Eliminar" className="text-muted-foreground hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
