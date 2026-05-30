import { AdoptionRequestStatus, PetStatus } from '@prisma/client';

export const ACTIVE_ADOPTION_STATUSES: AdoptionRequestStatus[] = ['RECEIVED', 'INTERVIEW', 'VISIT'];

export const PET_STATUS_TRANSITIONS: Record<PetStatus, PetStatus[]> = {
  QUARANTINE: ['AVAILABLE', 'TREATMENT'],
  AVAILABLE: ['TREATMENT', 'ADOPTED'],
  TREATMENT: ['AVAILABLE', 'DECEASED'],
  ADOPTED: [],
  DECEASED: [],
};

export function isTerminalPetStatus(status: PetStatus) {
  return PET_STATUS_TRANSITIONS[status].length === 0;
}

export function getAllowedPetTransitions(status: PetStatus) {
  return PET_STATUS_TRANSITIONS[status];
}

export function canTransitionPetStatus(currentStatus: PetStatus, nextStatus: PetStatus) {
  return PET_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);
}
