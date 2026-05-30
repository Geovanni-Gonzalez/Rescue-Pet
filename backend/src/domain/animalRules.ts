import { AdoptionRequestStatus, AnimalStatus } from '@prisma/client';

export const ACTIVE_ADOPTION_STATUSES: AdoptionRequestStatus[] = ['RECEIVED', 'INTERVIEW', 'VISIT'];

export const ANIMAL_STATUS_TRANSITIONS: Record<AnimalStatus, AnimalStatus[]> = {
  QUARANTINE: ['AVAILABLE', 'TREATMENT'],
  AVAILABLE: ['TREATMENT', 'ADOPTED'],
  TREATMENT: ['AVAILABLE', 'DECEASED'],
  ADOPTED: [],
  DECEASED: [],
};

export function isTerminalAnimalStatus(status: AnimalStatus) {
  return ANIMAL_STATUS_TRANSITIONS[status].length === 0;
}

export function getAllowedAnimalTransitions(status: AnimalStatus) {
  return ANIMAL_STATUS_TRANSITIONS[status];
}

export function canTransitionAnimalStatus(currentStatus: AnimalStatus, nextStatus: AnimalStatus) {
  return ANIMAL_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);
}
