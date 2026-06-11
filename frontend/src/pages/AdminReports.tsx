import { useState, useEffect, useCallback } from 'react';
import { BarChart3, FileText, FileSpreadsheet, Filter, Activity, HeartPulse } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Alert } from '../components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { apiClient, API_BASE, getApiErrorMessage } from '../lib/api';

type ReportTab = 'adoptions' | 'health';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdoptionRow {
  id: string;
  status: string;
  updatedAt: string;
  compatibilityScore: number | null;
  animal: { id: string; name: string; species: string };
  adopter: { id: string; fullName: string; email: string };
}

interface AdoptionSummary {
  total: number;
  approved: number;
  rejected: number;
}

interface HealthAnimal {
  id: string;
  name: string;
  species: string;
  status: string;
  vaccines: { id: string; vaccineType: string; status: string; nextDueAt: string }[];
  clinicalRecord?: { entries: { diagnosis: string; treatment: string; datetime: string }[] } | null;
}

interface HealthSummary {
  totalAnimals: number;
  inTreatment: number;
  withPendingVaccines: number;
  totalVaccinesPending: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AdminReports() {
  const [tab, setTab] = useState<ReportTab>('adoptions');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [speciesList, setSpeciesList] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Shared filters — default to last 30 days per CU-24
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [species, setSpecies] = useState('');

  // Adoption-specific
  const [statusFilter, setStatusFilter] = useState('');
  const [adoptionRows, setAdoptionRows] = useState<AdoptionRow[]>([]);
  const [adoptionSummary, setAdoptionSummary] = useState<AdoptionSummary | null>(null);

  // Health-specific
  const [treatmentActive, setTreatmentActive] = useState(false);
  const [vaccinePending, setVaccinePending] = useState(false);
  const [healthAnimals, setHealthAnimals] = useState<HealthAnimal[]>([]);
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);

  useEffect(() => {
    apiClient.get('/reports/species').then((r) => setSpeciesList(r.data.species)).catch(() => {});
  }, []);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (species) params.set('species', species);
    if (tab === 'adoptions' && statusFilter) params.set('status', statusFilter);
    if (tab === 'health') {
      if (treatmentActive) params.set('treatmentActive', 'true');
      if (vaccinePending) params.set('vaccinePending', 'true');
    }
    return params.toString();
  }, [from, to, species, tab, statusFilter, treatmentActive, vaccinePending]);

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const qs = buildParams();
      if (tab === 'adoptions') {
        const res = await apiClient.get(`/reports/adoptions?${qs}`);
        setAdoptionRows(res.data.applications);
        setAdoptionSummary(res.data.summary);
      } else {
        const res = await apiClient.get(`/reports/health?${qs}`);
        setHealthAnimals(res.data.animals);
        setHealthSummary(res.data.summary);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo cargar el reporte.'));
    } finally {
      setIsLoading(false);
    }
  }, [tab, buildParams]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const hasData = tab === 'adoptions' ? adoptionRows.length > 0 : healthAnimals.length > 0;

  const handleExport = async (format: 'pdf' | 'csv') => {
    if (!hasData) return;
    setIsExporting(true);
    setError('');
    try {
      const qs = buildParams();
      const endpoint = tab === 'adoptions'
        ? `/reports/adoptions/export/${format}`
        : `/reports/health/export/${format}`;

      const token = localStorage.getItem('rescue_pet_token');
      const response = await fetch(`${API_BASE}/api${endpoint}?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'Error al exportar');
      }

      const blob = await response.blob();
      const ext = format === 'pdf' ? 'pdf' : 'csv';
      const name = tab === 'adoptions' ? `reporte-adopciones.${ext}` : `reporte-salud.${ext}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Error al exportar');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-rescue-600" />
            Reportes Administrativos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Consulta, vista previa y exportación de datos</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasData || isExporting}
            onClick={() => handleExport('pdf')}
          >
            <FileText className="w-4 h-4 mr-1" /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasData || isExporting}
            onClick={() => handleExport('csv')}
          >
            <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel (CSV)
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger">{error}</Alert>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab('adoptions')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            tab === 'adoptions'
              ? 'border-rescue-600 text-rescue-600'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <HeartPulse className="w-4 h-4" /> Adopciones
        </button>
        <button
          onClick={() => setTab('health')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            tab === 'health'
              ? 'border-rescue-600 text-rescue-600'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Activity className="w-4 h-4" /> Salud
        </button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Filtros</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Desde</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full h-9 rounded-md border border-border px-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Hasta</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full h-9 rounded-md border border-border px-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Especie</label>
              <select
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                className="w-full h-9 rounded-md border border-border px-2 text-sm"
              >
                <option value="">Todas las especies</option>
                {speciesList.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {tab === 'adoptions' && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Estado</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-9 rounded-md border border-border px-2 text-sm"
                >
                  <option value="">Todos los estados</option>
                  <option value="APPROVED">Aprobadas</option>
                  <option value="REJECTED">Rechazadas</option>
                </select>
              </div>
            )}

            {tab === 'health' && (
              <>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={treatmentActive}
                      onChange={(e) => setTreatmentActive(e.target.checked)}
                      className="rounded border-border"
                    />
                    En tratamiento
                  </label>
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={vaccinePending}
                      onChange={(e) => setVaccinePending(e.target.checked)}
                      className="rounded border-border"
                    />
                    Vacunas pendientes
                  </label>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      {tab === 'adoptions' && adoptionSummary && (
        <div className="grid grid-cols-3 gap-4">
          <SummaryCard label="Total" value={adoptionSummary.total} color="text-foreground" />
          <SummaryCard label="Aprobadas" value={adoptionSummary.approved} color="text-green-600" />
          <SummaryCard label="Rechazadas" value={adoptionSummary.rejected} color="text-red-600" />
        </div>
      )}

      {tab === 'health' && healthSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard label="Animales" value={healthSummary.totalAnimals} color="text-foreground" />
          <SummaryCard label="En tratamiento" value={healthSummary.inTreatment} color="text-yellow-600" />
          <SummaryCard label="Con vacunas pend." value={healthSummary.withPendingVaccines} color="text-orange-600" />
          <SummaryCard label="Vacunas pendientes" value={healthSummary.totalVaccinesPending} color="text-red-600" />
        </div>
      )}

      {/* Data preview */}
      {isLoading ? (
        <LoadingState message="Cargando reporte..." />
      ) : !hasData ? (
        <EmptyState
          title="Sin datos"
          description="No hay resultados con los filtros seleccionados. Ajusta los filtros e intenta de nuevo."
          icon={<BarChart3 className="w-8 h-8" />}
        />
      ) : tab === 'adoptions' ? (
        <AdoptionTable rows={adoptionRows} />
      ) : (
        <HealthTable animals={healthAnimals} />
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 text-center">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function AdoptionTable({ rows }: { rows: AdoptionRow[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground">
          Vista previa ({rows.length} registros)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Animal</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Especie</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Adoptante</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Estado</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Afinidad</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border hover:bg-muted">
                  <td className="px-4 py-2 font-medium text-foreground">{r.animal.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.animal.species}</td>
                  <td className="px-4 py-2 text-foreground">{r.adopter.fullName}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{r.adopter.email}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      r.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {r.status === 'APPROVED' ? 'Aprobada' : 'Rechazada'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {r.compatibilityScore != null ? (
                      <span className="text-xs font-semibold text-rescue-600">{r.compatibilityScore.toFixed(0)}%</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {new Date(r.updatedAt).toLocaleDateString('es-CR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function HealthTable({ animals }: { animals: HealthAnimal[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground">
          Vista previa ({animals.length} animales)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Animal</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Especie</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Estado</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Vacunas pend.</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Último diagnóstico</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Último tratamiento</th>
              </tr>
            </thead>
            <tbody>
              {animals.map((a) => {
                const pending = a.vaccines.filter((v) => v.status === 'PENDING').length;
                const lastEntry = a.clinicalRecord?.entries?.[0];
                return (
                  <tr key={a.id} className="border-b border-border hover:bg-muted">
                    <td className="px-4 py-2 font-medium text-foreground">{a.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{a.species}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        a.status === 'TREATMENT' ? 'bg-yellow-100 text-yellow-700' :
                        a.status === 'QUARANTINE' ? 'bg-red-100 text-red-700' :
                        a.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' :
                        'bg-muted text-foreground'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {pending > 0 ? (
                        <span className="text-xs font-semibold text-orange-600">{pending}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground max-w-[200px] truncate">
                      {lastEntry?.diagnosis ?? <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground max-w-[200px] truncate">
                      {lastEntry?.treatment ?? <span className="text-muted-foreground">-</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
