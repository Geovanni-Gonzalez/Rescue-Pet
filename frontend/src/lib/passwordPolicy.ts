// Espejo de la política de contraseñas del backend (backend/src/utils/passwordPolicy.ts).
// Usada para mostrar los requisitos en tiempo real (CU-10 4E2, CU-12 4.1E).

export interface PasswordRequirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { id: 'length', label: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
  { id: 'uppercase', label: 'Al menos una letra mayúscula', test: (p) => /[A-ZÁÉÍÓÚÜÑ]/.test(p) },
  { id: 'lowercase', label: 'Al menos una letra minúscula', test: (p) => /[a-záéíóúüñ]/.test(p) },
  { id: 'number', label: 'Al menos un número', test: (p) => /\d/.test(p) },
  {
    id: 'special',
    label: 'Al menos un carácter especial (!@#$%&*...)',
    test: (p) => /[^A-Za-z0-9\sÁÉÍÓÚÜÑáéíóúüñ]/.test(p),
  },
];

/** Devuelve la lista de requisitos NO cumplidos (vacía si la contraseña es válida). */
export function getUnmetRequirements(password: string): PasswordRequirement[] {
  return PASSWORD_REQUIREMENTS.filter((req) => !req.test(password));
}
