import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PawPrint, HeartHandshake, Users, LogOut, Sparkles, ClipboardList, Syringe, Calendar, Bell, ClipboardCheck, Shield, BarChart3, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobile, onClose }: SidebarProps) {
  const { role, logout } = useAuth();

  const sections = [
    {
      label: 'Adopción',
      roles: ['ADOPTER'],
      links: [
        { to: '/catalog', label: 'Catálogo', icon: Sparkles, roles: ['ADOPTER'] },
        { to: '/compatibility-test', label: 'Test de afinidad', icon: ClipboardList, roles: ['ADOPTER'] },
        { to: '/adoption/my-requests', label: 'Mis Adopciones', icon: HeartHandshake, roles: ['ADOPTER'] },
      ],
    },
    {
      label: 'Mascotas',
      roles: ['ADMIN', 'VETERINARIAN', 'VOLUNTEER'],
      links: [
        { to: '/dashboard', label: 'Panel Principal', icon: LayoutDashboard, roles: ['ADMIN', 'VETERINARIAN', 'VOLUNTEER'] },
        { to: '/pets', label: 'Mascotas', icon: PawPrint, roles: ['ADMIN', 'VETERINARIAN', 'VOLUNTEER'] },
        { to: '/immunization-alerts', label: 'Vacunas', icon: Syringe, roles: ['ADMIN', 'VETERINARIAN', 'VOLUNTEER'] },
      ],
    },
    {
      label: 'Operaciones',
      roles: ['ADMIN', 'VOLUNTEER'],
      links: [
        { to: '/tasks', label: 'Tareas', icon: ClipboardCheck, roles: ['ADMIN', 'VETERINARIAN', 'VOLUNTEER'] },
        { to: '/admin/adoption-requests', label: 'Solicitudes', icon: HeartHandshake, roles: ['ADMIN', 'VOLUNTEER'] },
        { to: '/admin/interview-slots', label: 'Entrevistas', icon: Calendar, roles: ['ADMIN'] },
      ],
    },
    {
      label: 'Sistema',
      roles: ['ADMIN'],
      links: [
        { to: '/admin/users', label: 'Usuarios', icon: Users, roles: ['ADMIN'] },
        { to: '/admin/reports', label: 'Reportes', icon: BarChart3, roles: ['ADMIN'] },
        { to: '/admin/audit', label: 'Auditoría', icon: Shield, roles: ['ADMIN'] },
      ],
    },
    {
      label: null,
      roles: ['ADOPTER', 'VOLUNTEER', 'ADMIN', 'VETERINARIAN'],
      links: [
        { to: '/notifications', label: 'Notificaciones', icon: Bell, roles: ['ADOPTER', 'VOLUNTEER', 'ADMIN', 'VETERINARIAN'] },
        { to: '/profile', label: 'Mi Perfil', icon: Users, roles: ['ADOPTER', 'VOLUNTEER', 'ADMIN', 'VETERINARIAN'] },
      ],
    },
  ];

  const visibleSections = sections
    .map((section) => ({
      ...section,
      links: section.links.filter((l) => role && l.roles.includes(role)),
    }))
    .filter((section) => section.links.length > 0);

  const handleNavClick = () => {
    if (mobile && onClose) onClose();
  };

  return (
    <aside className={`w-64 bg-card border-r border-border h-full flex flex-col ${mobile ? 'flex' : 'hidden md:flex'}`}>
      <div className="px-6 pt-6 pb-5 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
            <PawPrint className="w-4 h-4" />
          </div>
          <span className="text-base font-bold text-foreground tracking-tight">Rescue Pet</span>
        </div>
        {mobile && onClose && (
          <button onClick={onClose} aria-label="Cerrar menú" className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-4 overflow-y-auto py-2">
        {visibleSections.map((section, sectionIndex) => (
          <div key={section.label ?? 'general'} className={sectionIndex > 0 ? 'mt-5 pt-4 border-t border-gray-100' : ''}>
            {section.label && (
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/admin'}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-[color,background-color,transform] duration-150 ease-out-strong active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isActive
                        ? 'bg-rescue-50 text-rescue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <button
          onClick={() => { logout(); handleNavClick(); }}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-[color,background-color,transform] duration-150 ease-out-strong active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
