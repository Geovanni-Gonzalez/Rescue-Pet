import { useState, useEffect, lazy, Suspense } from 'react';
import type { FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingState } from '../components/LoadingState';
import { StatusBadge, type PetStatus } from '../components/StatusBadge';
import { PetStatusSelector } from '../components/PetStatusSelector';
import { QRDisplay } from '../components/QRDisplay';
import { GalleryManager } from '../components/GalleryManager';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Edit, QrCode as QrIcon, Heart, MapPin, Clock, History, Syringe, Stethoscope, Plus, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { apiClient, getApiErrorMessage } from '../lib/api';

const LocationPicker = lazy(() =>
  import('../components/LocationPicker').then((m) => ({ default: m.LocationPicker })),
);

interface GalleryImage {
  id: string;
  fileUrl: string;
  fileType: string;
  isMain: boolean;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  estimatedBreed?: string;
  estimatedAge?: number;
  size?: string;
  status: PetStatus;
  mainPhotoUrl?: string;
  rescueLocationText?: string;
  rescueLatitude?: number;
  rescueLongitude?: number;
  qrUrl?: string;
  gallery: GalleryImage[];
}

interface LocationHistoryEntry {
  id: string;
  locationText?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  changedBy: { id: string; fullName: string };
}

interface AdoptionRequestSummary {
  id: string;
  petId: string;
  status: 'RECEIVED' | 'INTERVIEW' | 'VISIT' | 'APPROVED' | 'REJECTED';
}

interface Vaccine {
  id: string;
  vaccineType: string;
  appliedAt: string;
  nextDueAt?: string;
  status: 'PENDING' | 'COMPLETED' | 'POSTPONED';
}

interface ClinicalEntry {
  id: string;
  datetime: string;
  diagnosis: string;
  treatment: string;
  medicine?: string;
  dose?: string;
  duration?: string;
  observations?: string;
  createdAt: string;
  veterinarian?: { id: string; fullName: string };
  vaccines?: Vaccine[];
}

interface MedicalSummary {
  hasRecord: boolean;
  entryCount: number;
  recentEntries: { id: string; datetime: string; veterinarian?: { fullName: string } }[];
}

export function PetDetail() {
  const { id } = useParams();
  const { role } = useAuth();
  const navigate = useNavigate();

  const [pet, setPet] = useState<Pet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrUrl, setQrUrl] = useState('');

  const [gallery, setGallery] = useState<GalleryImage[]>([]);

  const [existingRequest, setExistingRequest] = useState<AdoptionRequestSummary | null>(null);
  const [showAdoptionConfirm, setShowAdoptionConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [clinicalEntries, setClinicalEntries] = useState<ClinicalEntry[]>([]);
  const [medicalSummary, setMedicalSummary] = useState<MedicalSummary | null>(null);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [clinicalForm, setClinicalForm] = useState({
    datetime: new Date().toISOString().slice(0, 16),
    diagnosis: '',
    treatment: '',
    medicine: '',
    dose: '',
    duration: '',
    observations: '',
  });
  const [vaccineForm, setVaccineForm] = useState({ vaccineType: '', appliedAt: new Date().toISOString().slice(0, 10), nextDueAt: '' });
  const [showVaccineForm, setShowVaccineForm] = useState(false);
  const [isSavingClinical, setIsSavingClinical] = useState(false);
  const [isSavingVaccine, setIsSavingVaccine] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  const [locationHistory, setLocationHistory] = useState<LocationHistoryEntry[]>([]);
  const [showLocationEdit, setShowLocationEdit] = useState(false);
  const [locationText, setLocationText] = useState('');
  const [locationLat, setLocationLat] = useState<number | undefined>();
  const [locationLng, setLocationLng] = useState<number | undefined>();
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        const res = await apiClient.get(`/animals/${id}`);
        const animalData: Pet = res.data.animal;
        setPet(animalData);
        setQrUrl(animalData.qrUrl ?? '');
        setGallery(animalData.gallery ?? []);
        setLocationText(animalData.rescueLocationText ?? '');
        setLocationLat(animalData.rescueLatitude ?? undefined);
        setLocationLng(animalData.rescueLongitude ?? undefined);

        if (role === 'ADMIN' || role === 'VETERINARIAN') {
          const [clinicalRes, vacRes] = await Promise.all([
            apiClient.get(`/animals/${id}/clinical-record`),
            apiClient.get(`/animals/${id}/vaccines`),
          ]);
          setClinicalEntries(clinicalRes.data.clinicalRecord?.entries ?? []);
          setVaccines(vacRes.data.vaccines ?? []);
        }

        if (role === 'VOLUNTEER') {
          const [summaryRes, vacRes] = await Promise.all([
            apiClient.get(`/animals/${id}/medical-summary`),
            apiClient.get(`/animals/${id}/vaccines`),
          ]);
          setMedicalSummary(summaryRes.data.summary);
          setVaccines(vacRes.data.vaccines ?? []);
        }

        if (role === 'ADMIN' || role === 'VOLUNTEER') {
          const locRes = await apiClient.get(`/animals/${id}/location-history`);
          setLocationHistory(locRes.data.history ?? []);
        }

        if (role === 'ADOPTER') {
          try {
            const myReqs = await apiClient.get('/adoption-applications');
            const existing = (myReqs.data.applications as AdoptionRequestSummary[]).find(
              (r) => r.petId === id && ['RECEIVED', 'INTERVIEW', 'VISIT'].includes(r.status),
            );
            if (existing) setExistingRequest(existing);
          } catch { /* ignore */ }
        }
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'No se pudo cargar la mascota'));
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [id, role]);

  const handleAdoptionRequest = async () => {
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/adoption-applications', { animalId: id });
      setExistingRequest(res.data.request);
      setShowAdoptionConfirm(false);
    } catch (err: unknown) {
      if (axios.isAxiosError<{ existingRequestId?: string }>(err) && err.response?.data?.existingRequestId) {
        setExistingRequest({ id: err.response.data.existingRequestId, petId: id ?? '', status: 'RECEIVED' });
      }
      setError(getApiErrorMessage(err, 'Error al crear la solicitud'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClinicalSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSavingClinical(true);
    try {
      const payload = {
        datetime: new Date(clinicalForm.datetime).toISOString(),
        diagnosis: clinicalForm.diagnosis,
        treatment: clinicalForm.treatment,
        medicine: clinicalForm.medicine || undefined,
        dose: clinicalForm.dose || undefined,
        duration: clinicalForm.duration || undefined,
        observations: clinicalForm.observations || undefined,
      };
      const res = await apiClient.post(`/animals/${id}/clinical-record/entries`, payload);
      setClinicalEntries((prev) => [res.data.entry, ...prev]);
      setClinicalForm({
        datetime: new Date().toISOString().slice(0, 16),
        diagnosis: '',
        treatment: '',
        medicine: '',
        dose: '',
        duration: '',
        observations: '',
      });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Error al guardar la entrada clínica'));
    } finally {
      setIsSavingClinical(false);
    }
  };

  const handleVaccineSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSavingVaccine(true);
    try {
      const payload = {
        vaccineType: vaccineForm.vaccineType,
        appliedAt: new Date(vaccineForm.appliedAt).toISOString(),
        nextDueAt: vaccineForm.nextDueAt ? new Date(vaccineForm.nextDueAt).toISOString() : undefined,
      };
      const res = await apiClient.post(`/animals/${id}/vaccines`, payload);
      setVaccines((prev) => [res.data.vaccine, ...prev]);
      setVaccineForm({ vaccineType: '', appliedAt: new Date().toISOString().slice(0, 10), nextDueAt: '' });
      setShowVaccineForm(false);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Error al guardar la vacuna'));
    } finally {
      setIsSavingVaccine(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!locationText && (locationLat === undefined || locationLng === undefined)) {
      setError('Ingresa una dirección o selecciona un punto en el mapa.');
      return;
    }
    setIsSavingLocation(true);
    try {
      const res = await apiClient.put(`/animals/${id}/rescue-location`, {
        rescueLocationText: locationText || undefined,
        rescueLatitude: locationLat,
        rescueLongitude: locationLng,
      });
      setPet((p) => p ? { ...p, rescueLocationText: locationText, rescueLatitude: locationLat, rescueLongitude: locationLng } : p);
      // Refresh history
      const locRes = await apiClient.get(`/animals/${id}/location-history`);
      setLocationHistory(locRes.data.history ?? []);
      setShowLocationEdit(false);
      setError('');
      return res;
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Error al guardar la localización'));
    } finally {
      setIsSavingLocation(false);
    }
  };

  const generateQR = async () => {
    try {
      const res = await apiClient.post(`/animals/${id}/qr/regenerate`);
      setQrUrl(res.data.qrUrl);
    } catch (err) {
      console.error('Error generando QR', err);
    }
  };

  if (isLoading) return <LoadingState />;
  if (error && !pet) return <div className="p-6 text-center text-red-500">{error}</div>;
  if (!pet) return null;

  const canEdit = role === 'ADMIN' || role === 'VOLUNTEER';
  const canChangeStatus = role === 'ADMIN' || role === 'VETERINARIAN';
  const canGenerateQR = role === 'ADMIN' || role === 'VOLUNTEER' || role === 'VETERINARIAN';
  const canRequestAdoption = role === 'ADOPTER' && pet.status === 'AVAILABLE';
  const canManageClinical = role === 'ADMIN' || role === 'VETERINARIAN';
  const canViewMedicalSummary = role === 'VOLUNTEER';
  const canViewVaccines = role === 'ADMIN' || role === 'VETERINARIAN' || role === 'VOLUNTEER';
  const canManageGallery = role === 'ADMIN' || role === 'VOLUNTEER';

  const vaccineStatusLabel: Record<string, string> = {
    PENDING: 'Pendiente',
    COMPLETED: 'Completada',
    POSTPONED: 'Postergada',
  };
  const vaccineStatusColor: Record<string, string> = {
    PENDING: 'text-yellow-600 bg-yellow-50',
    COMPLETED: 'text-green-600 bg-green-50',
    POSTPONED: 'text-gray-500 bg-gray-100',
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{pet.name}</h1>
        {canEdit && (
          <Button variant="outline" onClick={() => navigate(`/admin/pets/${id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" /> Editar Perfil
          </Button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="md:col-span-2 space-y-6">
          {/* Basic info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {pet.mainPhotoUrl ? (
                    <img src={pet.mainPhotoUrl} alt={pet.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Sin foto</div>
                  )}
                </div>
                <div className="space-y-3 flex-1">
                  <StatusBadge status={pet.status} />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-gray-500">Especie</p><p className="font-medium">{pet.species}</p></div>
                    <div><p className="text-gray-500">Raza</p><p className="font-medium">{pet.estimatedBreed || 'Desconocida'}</p></div>
                    <div><p className="text-gray-500">Edad est.</p><p className="font-medium">{pet.estimatedAge ? `${pet.estimatedAge} meses` : 'N/D'}</p></div>
                    <div><p className="text-gray-500">Tamaño</p><p className="font-medium">{pet.size || 'N/D'}</p></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gallery */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Galería de fotos
                <span className="text-xs font-normal text-gray-400">({gallery.length} imágenes)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GalleryManager
                animalId={pet.id}
                images={gallery}
                canManage={canManageGallery}
                onGalleryChange={setGallery}
              />
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Localización de rescate
                </CardTitle>
                {canEdit && (
                  <Button variant="ghost" size="sm" onClick={() => setShowLocationEdit((v) => !v)}>
                    {showLocationEdit ? 'Cancelar' : 'Editar'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {pet.rescueLocationText && (
                <p className="text-sm text-gray-700">{pet.rescueLocationText}</p>
              )}
              {pet.rescueLatitude && pet.rescueLongitude && (
                <p className="text-xs text-gray-400">
                  {pet.rescueLatitude}, {pet.rescueLongitude}
                </p>
              )}
              {!pet.rescueLocationText && !pet.rescueLatitude && (
                <p className="text-sm text-gray-400 italic">Sin localización registrada.</p>
              )}

              {showLocationEdit && (
                <div className="space-y-3 pt-2 border-t">
                  <input
                    type="text"
                    placeholder="Dirección de texto (opcional)"
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                  />
                  <Suspense fallback={<div className="h-64 bg-gray-100 rounded animate-pulse" />}>
                    <LocationPicker
                      latitude={locationLat}
                      longitude={locationLng}
                      onLocationChange={(lat, lng) => {
                        setLocationLat(lat);
                        setLocationLng(lng);
                      }}
                    />
                  </Suspense>
                  <Button size="sm" disabled={isSavingLocation} onClick={handleSaveLocation}>
                    {isSavingLocation ? 'Guardando...' : 'Guardar localización'}
                  </Button>
                </div>
              )}

              {/* Location history */}
              {locationHistory.length > 0 && (
                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                    <History className="w-3 h-3" /> Historial
                  </p>
                  {locationHistory.map((h) => (
                    <div key={h.id} className="text-xs text-gray-400 flex items-start gap-2">
                      <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <span>{h.locationText || `${h.latitude}, ${h.longitude}`}</span>
                        <span className="ml-2 text-gray-300">
                          — {new Date(h.createdAt).toLocaleDateString('es-CR')} · {h.changedBy.fullName}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clinical record — ADMIN / VETERINARIAN */}
          {canManageClinical && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Stethoscope className="w-4 h-4" /> Expediente Clínico
                  </CardTitle>
                  <span className="text-sm text-gray-500">{clinicalEntries.length} {clinicalEntries.length === 1 ? 'entrada' : 'entradas'}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* New entry form */}
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-rescue-600 hover:text-rescue-700 flex items-center gap-1 select-none">
                    <Plus className="w-4 h-4" /> Nueva entrada clínica
                  </summary>
                  <form onSubmit={handleClinicalSubmit} className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="text-xs text-gray-500 block mb-1">Fecha y hora *</label>
                      <input
                        type="datetime-local"
                        value={clinicalForm.datetime}
                        onChange={(e) => setClinicalForm((p) => ({ ...p, datetime: e.target.value }))}
                        className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Diagnóstico *</label>
                      <input
                        value={clinicalForm.diagnosis}
                        onChange={(e) => setClinicalForm((p) => ({ ...p, diagnosis: e.target.value }))}
                        className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm"
                        placeholder="Diagnóstico"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Tratamiento *</label>
                      <input
                        value={clinicalForm.treatment}
                        onChange={(e) => setClinicalForm((p) => ({ ...p, treatment: e.target.value }))}
                        className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm"
                        placeholder="Tratamiento"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Medicamento</label>
                      <input
                        value={clinicalForm.medicine}
                        onChange={(e) => setClinicalForm((p) => ({ ...p, medicine: e.target.value }))}
                        className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm"
                        placeholder="Nombre del medicamento"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Dosis</label>
                      <input
                        value={clinicalForm.dose}
                        onChange={(e) => setClinicalForm((p) => ({ ...p, dose: e.target.value }))}
                        className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm"
                        placeholder="Ej: 5 mg/kg"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Duración del tratamiento</label>
                      <input
                        value={clinicalForm.duration}
                        onChange={(e) => setClinicalForm((p) => ({ ...p, duration: e.target.value }))}
                        className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm"
                        placeholder="Ej: 7 días"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-gray-500 block mb-1">Observaciones</label>
                      <textarea
                        value={clinicalForm.observations}
                        onChange={(e) => setClinicalForm((p) => ({ ...p, observations: e.target.value }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none"
                        rows={2}
                        placeholder="Observaciones adicionales"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Button type="submit" size="sm" disabled={isSavingClinical}>
                        {isSavingClinical ? 'Guardando...' : 'Guardar entrada'}
                      </Button>
                    </div>
                  </form>
                </details>

                {/* Entries list */}
                <div className="space-y-2">
                  {clinicalEntries.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Sin entradas clínicas registradas.</p>
                  ) : (
                    clinicalEntries.map((entry) => (
                      <div key={entry.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-gray-900">{entry.diagnosis}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">
                                {new Date(entry.datetime).toLocaleDateString('es-CR')}
                              </span>
                              {expandedEntry === entry.id
                                ? <ChevronUp className="w-3 h-3 text-gray-400" />
                                : <ChevronDown className="w-3 h-3 text-gray-400" />}
                            </div>
                          </div>
                          {entry.veterinarian && (
                            <p className="text-xs text-gray-400 mt-0.5">Vet: {entry.veterinarian.fullName}</p>
                          )}
                        </button>
                        {expandedEntry === entry.id && (
                          <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                            <p className="text-gray-700"><span className="font-medium">Tratamiento:</span> {entry.treatment}</p>
                            {entry.medicine && <p className="text-gray-600"><span className="font-medium">Medicamento:</span> {entry.medicine}</p>}
                            {entry.dose && <p className="text-gray-600"><span className="font-medium">Dosis:</span> {entry.dose}</p>}
                            {entry.duration && <p className="text-gray-600"><span className="font-medium">Duración:</span> {entry.duration}</p>}
                            {entry.observations && <p className="text-gray-500 mt-1"><span className="font-medium">Obs:</span> {entry.observations}</p>}
                            {entry.vaccines && entry.vaccines.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-gray-500">Vacunas en esta entrada:</p>
                                {entry.vaccines.map((v) => (
                                  <p key={v.id} className="text-xs text-gray-500">• {v.vaccineType} — {new Date(v.appliedAt).toLocaleDateString('es-CR')}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vaccines — ADMIN / VETERINARIAN */}
          {canManageClinical && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Syringe className="w-4 h-4" /> Vacunas e Inmunizaciones
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowVaccineForm((v) => !v)}>
                    <Plus className="w-4 h-4 mr-1" /> Registrar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {showVaccineForm && (
                  <form onSubmit={handleVaccineSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3 border-b pb-4">
                    <div className="md:col-span-2">
                      <label className="text-xs text-gray-500 block mb-1">Tipo de vacuna *</label>
                      <input
                        value={vaccineForm.vaccineType}
                        onChange={(e) => setVaccineForm((p) => ({ ...p, vaccineType: e.target.value }))}
                        className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm"
                        placeholder="Ej: Rabia, Parvovirus, Moquillo"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Fecha de aplicación *</label>
                      <input
                        type="date"
                        value={vaccineForm.appliedAt}
                        onChange={(e) => setVaccineForm((p) => ({ ...p, appliedAt: e.target.value }))}
                        className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Próxima dosis</label>
                      <input
                        type="date"
                        value={vaccineForm.nextDueAt}
                        onChange={(e) => setVaccineForm((p) => ({ ...p, nextDueAt: e.target.value }))}
                        className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm"
                      />
                    </div>
                    <div className="md:col-span-2 flex gap-2">
                      <Button type="submit" size="sm" disabled={isSavingVaccine}>
                        {isSavingVaccine ? 'Guardando...' : 'Guardar vacuna'}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowVaccineForm(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </form>
                )}
                <div className="space-y-2">
                  {vaccines.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Sin vacunas registradas.</p>
                  ) : (
                    vaccines.map((v) => (
                      <div key={v.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium text-gray-900">{v.vaccineType}</p>
                          <p className="text-xs text-gray-400">Aplicada: {new Date(v.appliedAt).toLocaleDateString('es-CR')}</p>
                          {v.nextDueAt && (
                            <p className="text-xs text-gray-400">Próxima: {new Date(v.nextDueAt).toLocaleDateString('es-CR')}</p>
                          )}
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${vaccineStatusColor[v.status]}`}>
                          {vaccineStatusLabel[v.status]}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Medical summary — VOLUNTEER */}
          {canViewMedicalSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" /> Resumen Médico
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {medicalSummary ? (
                  <>
                    <div className="flex gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Entradas clínicas</p>
                        <p className="font-semibold text-gray-900">{medicalSummary.entryCount}</p>
                      </div>
                    </div>
                    {medicalSummary.recentEntries.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500">Últimas consultas:</p>
                        {medicalSummary.recentEntries.map((e) => (
                          <div key={e.id} className="text-xs text-gray-600 flex items-center gap-2">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            {new Date(e.datetime).toLocaleDateString('es-CR')}
                            {e.veterinarian && <span className="text-gray-400">— {e.veterinarian.fullName}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {!medicalSummary.hasRecord && (
                      <p className="text-sm text-gray-500 italic">Sin expediente clínico registrado.</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500 italic">Sin expediente clínico registrado.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Vaccines — VOLUNTEER (read only) */}
          {canViewVaccines && !canManageClinical && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Syringe className="w-4 h-4" /> Vacunas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vaccines.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Sin vacunas registradas.</p>
                ) : (
                  <div className="space-y-2">
                    {vaccines.map((v) => (
                      <div key={v.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium text-gray-900">{v.vaccineType}</p>
                          <p className="text-xs text-gray-400">Aplicada: {new Date(v.appliedAt).toLocaleDateString('es-CR')}</p>
                          {v.nextDueAt && (
                            <p className="text-xs text-gray-400">Próxima: {new Date(v.nextDueAt).toLocaleDateString('es-CR')}</p>
                          )}
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${vaccineStatusColor[v.status]}`}>
                          {vaccineStatusLabel[v.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Adoption request */}
          {canRequestAdoption && (
            <Card>
              <CardContent className="pt-4">
                {existingRequest ? (
                  <Button variant="outline" className="w-full" onClick={() => navigate(`/adoption/my-requests/${existingRequest.id}`)}>
                    <Heart className="w-4 h-4 mr-2" />Ver Solicitud Existente
                  </Button>
                ) : (
                  <Button className="w-full" onClick={() => setShowAdoptionConfirm(true)} disabled={isSubmitting}>
                    <Heart className="w-4 h-4 mr-2" />Solicitar Adopción
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Status selector */}
          {canChangeStatus && (
            <PetStatusSelector
              petId={pet.id}
              currentStatus={pet.status}
              onStatusChanged={(newStatus) => setPet({ ...pet, status: newStatus })}
            />
          )}

          {/* QR */}
          {canGenerateQR && (
            <Card>
              <CardContent className="pt-4 text-center">
                {qrUrl ? (
                  <QRDisplay qrCodeUrl={qrUrl} petName={pet.name} />
                ) : (
                  <div className="py-6">
                    <p className="text-sm text-gray-500 mb-4">Sin código QR generado.</p>
                    <Button onClick={generateQR} variant="outline" className="w-full">
                      <QrIcon className="w-4 h-4 mr-2" /> Generar QR
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showAdoptionConfirm}
        onOpenChange={setShowAdoptionConfirm}
        onConfirm={handleAdoptionRequest}
        title="Solicitar Adopción"
        description={`¿Confirmas que deseas solicitar adoptar a ${pet.name}?`}
        confirmText="Solicitar"
      />
    </div>
  );
}
