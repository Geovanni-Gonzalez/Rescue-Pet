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
import { Edit, QrCode as QrIcon, Heart, MapPin, Clock, History } from 'lucide-react';
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

interface ClinicalEntry {
  id: string;
  diagnosis: string;
  treatment?: string;
  observations?: string;
  createdAt: string;
  veterinarian?: { fullName: string };
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
  const [clinicalForm, setClinicalForm] = useState({ diagnosis: '', treatment: '', observations: '' });
  const [isSavingClinical, setIsSavingClinical] = useState(false);

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
          const clinicalRes = await apiClient.get(`/animals/${id}/clinical-record`);
          setClinicalEntries(clinicalRes.data.clinicalRecord?.entries ?? []);
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
      const res = await apiClient.post(`/animals/${id}/clinical-record/entries`, {
        ...clinicalForm,
        datetime: new Date().toISOString(),
      });
      setClinicalEntries((prev) => [res.data.entry, ...prev]);
      setClinicalForm({ diagnosis: '', treatment: '', observations: '' });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Error al guardar la entrada clínica'));
    } finally {
      setIsSavingClinical(false);
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
  const canManageGallery = role === 'ADMIN' || role === 'VOLUNTEER';

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

          {/* Clinical record */}
          {canManageClinical && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Expediente Clínico</CardTitle>
                  <span className="text-sm text-gray-500">{clinicalEntries.length} entradas</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleClinicalSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    value={clinicalForm.diagnosis}
                    onChange={(e) => setClinicalForm((p) => ({ ...p, diagnosis: e.target.value }))}
                    className="h-10 rounded-md border border-gray-300 px-3 text-sm"
                    placeholder="Diagnóstico *"
                    required
                  />
                  <input
                    value={clinicalForm.treatment}
                    onChange={(e) => setClinicalForm((p) => ({ ...p, treatment: e.target.value }))}
                    className="h-10 rounded-md border border-gray-300 px-3 text-sm"
                    placeholder="Tratamiento *"
                    required
                  />
                  <input
                    value={clinicalForm.observations}
                    onChange={(e) => setClinicalForm((p) => ({ ...p, observations: e.target.value }))}
                    className="h-10 rounded-md border border-gray-300 px-3 text-sm md:col-span-2"
                    placeholder="Observaciones"
                  />
                  <div className="md:col-span-2">
                    <Button type="submit" size="sm" disabled={isSavingClinical}>
                      {isSavingClinical ? 'Guardando...' : 'Agregar entrada clínica'}
                    </Button>
                  </div>
                </form>

                <div className="space-y-2">
                  {clinicalEntries.length === 0 ? (
                    <p className="text-sm text-gray-500">Sin entradas clínicas.</p>
                  ) : (
                    clinicalEntries.map((entry) => (
                      <div key={entry.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-medium text-gray-900">{entry.diagnosis}</p>
                          <p className="text-xs text-gray-400">{new Date(entry.createdAt).toLocaleDateString('es-CR')}</p>
                        </div>
                        {entry.treatment && <p className="text-gray-700">{entry.treatment}</p>}
                        {entry.observations && <p className="text-gray-500 mt-1">{entry.observations}</p>}
                        {entry.veterinarian && (
                          <p className="text-xs text-gray-400 mt-1">— {entry.veterinarian.fullName}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
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
