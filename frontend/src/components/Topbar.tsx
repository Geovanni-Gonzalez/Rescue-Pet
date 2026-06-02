import { Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from './RoleBadge';
import { NotificationBell } from './NotificationBell';

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-4">
        <button
          className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-md"
          onClick={onMenuClick}
          aria-label="Abrir menú"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="text-gray-700 font-medium hidden sm:block">
          ¡Hola, {user?.fullName?.split(' ')[0]}!
        </span>
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />

        <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-sm font-medium text-gray-900">{user?.fullName}</span>
            {user?.role && <RoleBadge role={user.role} />}
          </div>
          <div className="w-9 h-9 rounded-full bg-rescue-100 text-rescue-600 flex items-center justify-center font-bold">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
