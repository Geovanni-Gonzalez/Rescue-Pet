import { Check, X } from 'lucide-react';
import { PASSWORD_REQUIREMENTS } from '../lib/passwordPolicy';

interface PasswordRequirementsListProps {
  password: string;
}

/** Checklist en vivo de la política de contraseñas (CU-10 4E2, CU-12 4.1E). */
export function PasswordRequirementsList({ password }: PasswordRequirementsListProps) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3">
      <p className="text-sm font-medium text-foreground mb-2">Requisitos de la contraseña:</p>
      <ul className="space-y-1">
        {PASSWORD_REQUIREMENTS.map((req) => {
          const fulfilled = password.length > 0 && req.test(password);
          return (
            <li key={req.id} className="flex items-center gap-2 text-sm">
              {fulfilled ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-muted-foreground" />
              )}
              <span className={fulfilled ? 'text-green-700' : 'text-muted-foreground'}>{req.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
