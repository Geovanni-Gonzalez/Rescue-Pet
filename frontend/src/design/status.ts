// Single source of truth for status and feedback styling.
//
// Color values live as OKLCH tokens in `src/index.css` (light + dark) and are
// registered in `tailwind.config.js` under the `status` color group. This module
// maps each domain status to one of six semantic roles and exposes the class
// strings that reference those tokens. Components import from here instead of
// hardcoding Tailwind palette colors, so status semantics have one definition
// and respond to dark mode.

export type SemanticRole = 'success' | 'caution' | 'info' | 'adopted' | 'neutral' | 'danger';

// Soft surface: tinted background + readable foreground + matching border.
// Use for badges, pills, and feedback banners. Class strings are written out in
// full so Tailwind's JIT picks them up.
export const roleClasses: Record<SemanticRole, string> = {
  success: 'bg-status-success text-status-success-fg border-status-success-bd',
  caution: 'bg-status-caution text-status-caution-fg border-status-caution-bd',
  info: 'bg-status-info text-status-info-fg border-status-info-bd',
  adopted: 'bg-status-adopted text-status-adopted-fg border-status-adopted-bd',
  neutral: 'bg-status-neutral text-status-neutral-fg border-status-neutral-bd',
  danger: 'bg-status-danger text-status-danger-fg border-status-danger-bd',
};

// Saturated fill for solid markers (e.g. timeline step circles). Only the roles
// that need a solid treatment are defined.
export const roleSolid: Partial<Record<SemanticRole, string>> = {
  success: 'bg-status-success-solid border-status-success-solid text-status-on-solid',
  info: 'bg-status-info-solid border-status-info-solid text-status-on-solid',
  danger: 'bg-status-danger-solid border-status-danger-solid text-status-on-solid',
};

// ── Pet lifecycle status ─────────────────────────────────────────────────────
export type PetStatus = 'QUARANTINE' | 'AVAILABLE' | 'TREATMENT' | 'ADOPTED' | 'DECEASED';

export const PET_STATUS: Record<PetStatus, { label: string; role: SemanticRole }> = {
  AVAILABLE: { label: 'Disponible', role: 'success' },
  QUARANTINE: { label: 'En Cuarentena', role: 'caution' },
  TREATMENT: { label: 'En Tratamiento', role: 'info' },
  ADOPTED: { label: 'Adoptado', role: 'adopted' },
  DECEASED: { label: 'Fallecido', role: 'neutral' },
};

// ── Adoption request status ──────────────────────────────────────────────────
export type AdoptionRequestStatusType = 'RECEIVED' | 'INTERVIEW' | 'VISIT' | 'APPROVED' | 'REJECTED';

export const ADOPTION_STATUS: Record<AdoptionRequestStatusType, { label: string; role: SemanticRole }> = {
  RECEIVED: { label: 'Recibida', role: 'info' },
  INTERVIEW: { label: 'Entrevista', role: 'caution' },
  VISIT: { label: 'Visita', role: 'adopted' },
  APPROVED: { label: 'Aprobada', role: 'success' },
  REJECTED: { label: 'Rechazada', role: 'danger' },
};

// ── Notification / feedback levels ───────────────────────────────────────────
export type FeedbackLevel = 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';

export const FEEDBACK_ROLE: Record<FeedbackLevel, SemanticRole> = {
  INFO: 'info',
  WARNING: 'caution',
  SUCCESS: 'success',
  ERROR: 'danger',
};

// Compact bg + fg only (no border), for the small notification type tags.
// Literal strings (not interpolated) so Tailwind's JIT detects every class.
const roleTag: Record<SemanticRole, string> = {
  success: 'bg-status-success text-status-success-fg',
  caution: 'bg-status-caution text-status-caution-fg',
  info: 'bg-status-info text-status-info-fg',
  adopted: 'bg-status-adopted text-status-adopted-fg',
  neutral: 'bg-status-neutral text-status-neutral-fg',
  danger: 'bg-status-danger text-status-danger-fg',
};

export const feedbackTagClasses = (level: string): string => {
  const role = FEEDBACK_ROLE[level as FeedbackLevel] ?? 'info';
  return roleTag[role];
};

// ── Affinity score ───────────────────────────────────────────────────────────
// High affinity keeps the warm amber accent (the brand's secondary color);
// mid and low route through the shared roles.
export const affinityClasses = (score: number): string => {
  if (score >= 80) return 'bg-warm-50 text-warm-700 border-warm-100';
  if (score >= 50) return roleClasses.caution;
  return roleClasses.neutral;
};
