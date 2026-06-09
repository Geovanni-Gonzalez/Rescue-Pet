import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import { apiClient } from '../lib/api';
import { requestPushPermission, showBrowserNotification, getPushPermission } from '../lib/pushNotifications';
import { feedbackTagClasses } from '../design/status';

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

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const prevCountRef = useRef(0);
  const pushAskedRef = useRef(false);

  const fetchCount = useCallback(async () => {
    if (document.hidden) return;
    try {
      const res = await apiClient.get('/notifications/unread-count');
      const newCount = res.data.unreadCount as number;

      if (newCount > prevCountRef.current && prevCountRef.current > 0) {
        showBrowserNotification('Rescue Pet', {
          body: `Tienes ${newCount} notificaciones sin leer`,
          tag: 'rescue-pet-unread',
        });
      }
      prevCountRef.current = newCount;
      setUnreadCount(newCount);
    } catch { /* silent */ }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/notifications?limit=10');
      setNotifications(res.data.notifications);
      const count = res.data.unreadCount as number;
      prevCountRef.current = count;
      setUnreadCount(count);
    } catch { /* silent */ }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);

    if (!pushAskedRef.current && getPushPermission() === 'default') {
      pushAskedRef.current = true;
      const timer = setTimeout(() => requestPushPermission(), 10000);
      return () => { clearInterval(interval); clearTimeout(timer); };
    }

    return () => clearInterval(interval);
  }, [fetchCount]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        bellRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const markRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      await apiClient.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const deleteNotif = async (id: string, wasUnread: boolean) => {
    try {
      await apiClient.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={bellRef}
        onClick={() => setOpen(!open)}
        aria-label={unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones'}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="p-2 text-muted-foreground hover:bg-muted rounded-full relative transition-transform duration-150 ease-out-strong active:scale-[0.93] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-warm-600 text-white text-xs font-bold rounded-full border-2 border-white px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      <span className="sr-only" aria-live="polite">
        {unreadCount > 0 ? `${unreadCount} notificaciones sin leer` : ''}
      </span>

      {open && (
        <div role="dialog" aria-label="Notificaciones" className="absolute right-0 top-full mt-2 w-96 bg-card rounded-lg shadow-lg border border-border z-50 overflow-hidden dropdown-enter">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground">Notificaciones</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-rescue-600 hover:text-rescue-700 flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Leer todo
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar notificaciones"
                className="p-1.5 text-muted-foreground hover:text-muted-foreground rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Cargando...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Sin notificaciones</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-border hover:bg-muted transition-colors ${!n.readAt ? 'bg-blue-50/40' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${feedbackTagClasses(n.type)}`}>
                          {n.type}
                        </span>
                        <span className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {!n.readAt && (
                        <button onClick={() => markRead(n.id)} aria-label="Marcar como leída" className="p-1.5 text-muted-foreground hover:text-status-success-fg rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" title="Marcar como leída">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => deleteNotif(n.id, !n.readAt)} aria-label="Eliminar notificación" className="p-1.5 text-muted-foreground hover:text-destructive rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border px-4 py-2">
            <button
              onClick={() => { setOpen(false); navigate('/notifications'); }}
              className="text-sm text-rescue-600 hover:text-rescue-700 font-medium w-full text-center"
            >
              Ver todas las notificaciones
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
