import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PawPrint, HeartHandshake, Settings, Users, LogOut, Sparkles, ClipboardList, Syringe, Calendar, Bell, ClipboardCheck, Shield, BarChart3, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobile, onClose }: SidebarProps) {
  const { role, logout } = useAuth();

  const links = [
    { to: '/dashboard', label: 'Panel Principal', icon: LayoutDashboard, roles: ['ADMIN', 'VETERINARIAN', 'VOLUNTEER'] },
    { to: '/pets', label: 'Gestión de Mascotas', icon: PawPrint, roles: ['ADMIN', 'VETERINARIAN', 'VOLUNTEER'] },
    { to: '/immunization-alerts', label: 'Alertas de Vacunas', icon: Syringe, roles: ['ADMIN', 'VETERINARIAN', 'VOLUNTEER'] },
    { to: '/tasks', label: 'Tareas Operativas', icon: ClipboardCheck, roles: ['ADMIN', 'VETERINARIAN', 'VOLUNTEER'] },
    { to: '/admin/interview-slots', label: 'Agenda Entrevistas', icon: Calendar, roles: ['ADMIN'] },
    { to: '/catalog', label: 'Catálogo Inteligente', icon: Sparkles, roles: ['ADOPTER'] },
    { to: '/compatibility-test', label: 'Test de Afinidad', icon: ClipboardList, roles: ['ADOPTER'] },
    { to: '/adoption', label: 'Adopciones', icon: HeartHandshake, roles: ['ADOPTER', 'VOLUNTEER', 'ADMIN'] },
    { to: '/notifications', label: 'Notificaciones', icon: Bell, roles: ['ADOPTER', 'VOLUNTEER', 'ADMIN', 'VETERINARIAN'] },
    { to: '/admin', label: 'Administración', icon: Settings, roles: ['ADMIN'] },
    { to: '/admin/reports', label: 'Reportes', icon: BarChart3, roles: ['ADMIN'] },
    { to: '/admin/audit', label: 'Auditoría', icon: Shield, roles: ['ADMIN'] },
    { to: '/admin/users', label: 'Usuarios', icon: Users, roles: ['ADMIN'] },
    { to: '/profile', label: 'Mi Perfil', icon: Users, roles: ['ADOPTER', 'VOLUNTEER', 'ADMIN', 'VETERINARIAN'] },
  ];

  const visibleLinks = links.filter((l) => role && l.roles.includes(role));

  const handleNavClick = () => {
    if (mobile && onClose) onClose();
  };

  return (
    <aside className={`w-64 bg-white border-r border-gray-200 h-full flex flex-col ${mobile ? 'flex' : 'hidden md:flex'}`}>
      <div className="p-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-rescue-600 flex items-center gap-2">
          <PawPrint className="w-6 h-6" />
          Rescue Pet
        </h2>
        {mobile && onClose && (
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 md:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {visibleLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/admin'}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-rescue-50 text-rescue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <link.icon className="w-5 h-5" />
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => { logout(); handleNavClick(); }}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-md text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
