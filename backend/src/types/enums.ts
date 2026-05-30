// Constantes de dominio — reemplazan los enums de Prisma
// (SQL Server no soporta enum nativo en Prisma; se almacenan como String)

export type Role = 'ADMIN' | 'VETERINARIAN' | 'VOLUNTEER' | 'ADOPTER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING_VERIFICATION' | 'BLOCKED';
export type AnimalStatus = 'QUARANTINE' | 'AVAILABLE' | 'TREATMENT' | 'ADOPTED' | 'DECEASED';
export type AdoptionRequestStatus = 'RECEIVED' | 'INTERVIEW' | 'VISIT' | 'APPROVED' | 'REJECTED';
export type DocumentType = 'ID_CARD' | 'ADDRESS_PROOF';
export type DocumentStatus = 'ACTIVE' | 'ARCHIVED';
export type ContractStatus = 'GENERATED' | 'SIGNED';
export type VaccineStatus = 'PENDING' | 'COMPLETED' | 'POSTPONED';
export type TaskType = 'HEALTH' | 'MEDICATION' | 'CLEANING' | 'FEEDING' | 'MAINTENANCE';
export type TaskStatus = 'PENDING' | 'COMPLETED';

export const Roles: Record<Role, Role> = {
  ADMIN: 'ADMIN',
  VETERINARIAN: 'VETERINARIAN',
  VOLUNTEER: 'VOLUNTEER',
  ADOPTER: 'ADOPTER',
};

export const AnimalStatuses: Record<AnimalStatus, AnimalStatus> = {
  QUARANTINE: 'QUARANTINE',
  AVAILABLE: 'AVAILABLE',
  TREATMENT: 'TREATMENT',
  ADOPTED: 'ADOPTED',
  DECEASED: 'DECEASED',
};

export const AdoptionStatuses: Record<AdoptionRequestStatus, AdoptionRequestStatus> = {
  RECEIVED: 'RECEIVED',
  INTERVIEW: 'INTERVIEW',
  VISIT: 'VISIT',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

export const DocumentTypes: Record<DocumentType, DocumentType> = {
  ID_CARD: 'ID_CARD',
  ADDRESS_PROOF: 'ADDRESS_PROOF',
};

export const TaskTypes: Record<TaskType, TaskType> = {
  HEALTH: 'HEALTH',
  MEDICATION: 'MEDICATION',
  CLEANING: 'CLEANING',
  FEEDING: 'FEEDING',
  MAINTENANCE: 'MAINTENANCE',
};
