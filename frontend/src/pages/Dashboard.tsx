import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PawPrint, HeartHandshake, Syringe, ClipboardCheck, Users, BarChart3 } from 'lucide-react';

interface QuickAction {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  roles: string[];
}

const actions: QuickAction[] = [
  { label: 'Mascotas', description: 'Gestionar el catálogo de animales', icon: PawPrint, to: '/pets', roles: ['ADMIN', 'VETERINARIAN', 'VOLUNTEER'] },
  { label: 'Solicitudes', description: 'Revisar solicitudes de adopción', icon: HeartHandshake, to: '/admin/adoption-requests', roles: ['ADMIN', 'VOLUNTEER'] },
  { label: 'Vacunas', description: 'Alertas e inmunizaciones pendientes', icon: Syringe, to: '/immunization-alerts', roles: ['ADMIN', 'VETERINARIAN', 'VOLUNTEER'] },
  { label: 'Tareas', description: 'Operaciones asignadas al equipo', icon: ClipboardCheck, to: '/tasks', roles: ['ADMIN', 'VETERINARIAN', 'VOLUNTEER'] },
  { label: 'Usuarios', description: 'Administrar cuentas del equipo', icon: Users, to: '/admin/users', roles: ['ADMIN'] },
  { label: 'Reportes', description: 'Métricas y estadísticas', icon: BarChart3, to: '/admin/reports', roles: ['ADMIN'] },
];

export function Dashboard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const visible = actions.filter((a) => role && a.roles.includes(role));

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Hola, {user?.fullName?.split(' ')[0]}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Selecciona una sección para comenzar.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger-grid">
        {visible.map((action) => (
          <button
            key={action.to}
            type="button"
            onClick={() => navigate(action.to)}
            className="flex items-start gap-3.5 p-4 rounded-xl border border-border bg-card text-left transition-[box-shadow,border-color,transform] duration-200 ease-out-strong hover:shadow-sm hover:border-rescue-500/30 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="w-9 h-9 rounded-lg bg-rescue-50 text-rescue-600 flex items-center justify-center flex-shrink-0">
              <action.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{action.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
