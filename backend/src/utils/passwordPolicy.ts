// Política de seguridad de contraseñas (CU-10, excepción 4E2).
// Compartida por el cambio de contraseña; el frontend replica esta lista
// para mostrar los requisitos en vivo.

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
export function getPasswordPolicyViolations(password: string): string[] {
  return PASSWORD_REQUIREMENTS.filter((req) => !req.test(password)).map((req) => req.label);
}
