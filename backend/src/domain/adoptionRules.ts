import { AdoptionRequestStatus, DocumentType } from '@prisma/client';

export const ACTIVE_ADOPTION_REQUEST_STATUSES: AdoptionRequestStatus[] = ['RECEIVED', 'INTERVIEW', 'VISIT'];
export const REQUIRED_ADOPTION_DOCUMENTS: DocumentType[] = ['ID_CARD', 'ADDRESS_PROOF'];

export const ADOPTION_STATUS_TRANSITIONS: Record<AdoptionRequestStatus, AdoptionRequestStatus[]> = {
  RECEIVED: ['INTERVIEW', 'REJECTED'],
  INTERVIEW: ['VISIT', 'REJECTED'],
  VISIT: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: [],
};

export function getAllowedAdoptionTransitions(status: AdoptionRequestStatus) {
  return ADOPTION_STATUS_TRANSITIONS[status];
}

export function canTransitionAdoptionStatus(currentStatus: AdoptionRequestStatus, nextStatus: AdoptionRequestStatus) {
  return ADOPTION_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);
}
