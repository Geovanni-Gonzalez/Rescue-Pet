import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PawPrint, HeartHandshake, Settings, Users, LogOut, Sparkles, ClipboardList, Syringe, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Sidebar() {
  const { role, logout } = useAuth();

  const links = [
    // Panel general (staff interno)
    { to: '/dashboard', label: 'Panel Principal', icon: LayoutDashboard, roles: ['ADMIN', 'VETERINARIAN', 'VOLUNTEER'] },
    // Gestión interna de mascotas (todos los estados)
    { to: '/pets', label: 'Gestión de Mascotas', icon: PawPrint, roles: ['ADMIN', 'VETERINARIAN', 'VOLUNTEER'] },
    // Alertas de inmunización (Fase 3)
    { to: '/immunization-alerts', label: 'Alertas de Vacunas', icon: Syringe, roles: ['ADMIN', 'VETERINARIAN', 'VOLUNTEER'] },
    // Agenda de entrevistas (Fase 5)
    { to: '/admin/interview-slots', label: 'Agenda Entrevistas', icon: Calendar, roles: ['ADMIN'] },
    // Catálogo inteligente (solo adoptantes)
    { to: '/catalog', label: 'Catálogo Inteligente', icon: Sparkles, roles: ['ADOPTER'] },
    // Test de afinidad (solo adoptantes)
    { to: '/compatibility-test', label: 'Test de Afinidad', icon: ClipboardList, roles: ['ADOPTER'] },
    // Adopciones (todos)
    { to: '/adoption', label: 'Adopciones', icon: HeartHandshake, roles: ['ADOPTER', 'VOLUNTEER', 'ADMIN'] },
    // Admin
    { to: '/admin', label: 'Administración', icon: Settings, roles: ['ADMIN'] },
    // Perfil
    { to: '/profile', label: 'Mi Perfil', icon: Users, roles: ['ADOPTER', 'VOLUNTEER', 'ADMIN', 'VETERINARIAN'] },
  ];

  const visibleLinks = links.filter((l) => role && l.roles.includes(role));

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-full flex flex-col hidden md:flex">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-rescue-600 flex items-center gap-2">
          <PawPrint className="w-6 h-6" />
          Rescue Pet
        </h2>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {visibleLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
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
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-md text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
