import { useState, useEffect, useCallback } from 'react';
import { Shield, ChevronLeft, ChevronRight, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Alert } from '../components/ui/alert';
import { Card, CardContent } from '../components/ui/card';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { apiClient, getApiErrorMessage } from '../lib/api';

interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadataJson?: string;
  ipAddress?: string;
  createdAt: string;
  user: { id: string; fullName: string; role: string; email: string };
}

const ACTION_COLORS: Record<string, string> = {
  CREATE_ADOPTION_APPLICATION: 'bg-blue-100 text-blue-700',
  UPDATE_APPLICATION_STATUS: 'bg-yellow-100 text-yellow-700',
  UPLOAD_DOCUMENT: 'bg-purple-100 text-purple-700',
  SIGN_CONTRACT: 'bg-green-100 text-green-700',
  COMPLETE_TASK: 'bg-emerald-100 text-emerald-700',
  CREATE_TASK: 'bg-cyan-100 text-cyan-700',
  ACCESS_DENIED: 'bg-red-100 text-red-700',
};

export function AuditLog() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [actions, setActions] = useState<string[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const limit = 30;

  useEffect(() => {
    Promise.all([
      apiClient.get('/audit/actions'),
      apiClient.get('/audit/entity-types'),
    ]).then(([aRes, eRes]) => {
      setActions(aRes.data.actions);
      setEntityTypes(eRes.data.entityTypes);
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (actionFilter) params.set('action', actionFilter);
      if (entityTypeFilter) params.set('entityType', entityTypeFilter);
      const res = await apiClient.get(`/audit?${params}`);
      setLogs(res.data.logs);
      setTotal(res.data.total);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error al cargar registros de auditoría'));
    } finally {
      setIsLoading(false);
    }
  }, [page, actionFilter, entityTypeFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / limit);

  const parseMetadata = (json?: string) => {
    if (!json) return null;
    try { return JSON.parse(json); } catch { return null; }
  };

  if (isLoading && page === 1) return <LoadingState />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-rescue-600" />
            Registro de Auditoría
          </h1>
          <p className="text-sm text-gray-500 mt-1">Historial inalterable de acciones del sistema</p>
        </div>
        <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
          {total} {total === 1 ? 'registro' : 'registros'}
        </span>
      </div>

      {error && (
        <Alert variant="danger">{error}</Alert>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="h-8 rounded-md border border-gray-300 px-2 text-sm"
        >
          <option value="">Todas las acciones</option>
          {actions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select
          value={entityTypeFilter}
          onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(1); }}
          className="h-8 rounded-md border border-gray-300 px-2 text-sm"
        >
          <option value="">Todos los tipos</option>
          {entityTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {logs.length === 0 ? (
        <EmptyState
          title="Sin registros"
          description="No hay registros de auditoría con los filtros seleccionados."
          icon={<Shield className="w-8 h-8" />}
        />
      ) : (
        <div className="space-y-1">
          {logs.map((log) => {
            const meta = parseMetadata(log.metadataJson);
            const expanded = expandedId === log.id;
            const colorClass = ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700';
            return (
              <Card key={log.id} className="hover:bg-gray-50/50 transition-colors">
                <CardContent className="py-3 px-4">
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => setExpandedId(expanded ? null : log.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colorClass}`}>
                          {log.action}
                        </span>
                        <span className="text-xs text-gray-500">{log.entityType}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(log.createdAt).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-0.5">
                        <span className="font-medium">{log.user.fullName}</span>
                        <span className="text-gray-400"> ({log.user.role})</span>
                      </p>
                    </div>
                    {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>

                  {expanded && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-xs space-y-1.5 text-gray-600">
                      <div className="grid grid-cols-2 gap-2">
                        <div><span className="font-medium text-gray-500">ID registro:</span> <span className="font-mono">{log.id}</span></div>
                        <div><span className="font-medium text-gray-500">ID entidad:</span> <span className="font-mono">{log.entityId}</span></div>
                        <div><span className="font-medium text-gray-500">Usuario:</span> {log.user.email}</div>
                        <div><span className="font-medium text-gray-500">IP:</span> {log.ipAddress || 'N/A'}</div>
                      </div>
                      {meta && (
                        <div>
                          <span className="font-medium text-gray-500">Metadata:</span>
                          <pre className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono overflow-x-auto">
                            {JSON.stringify(meta, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-600">Página {page} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
