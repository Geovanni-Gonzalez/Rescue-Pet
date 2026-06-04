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
    <header className="bg-card border-b border-border h-16 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-4">
        <button
          className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-md"
          onClick={onMenuClick}
          aria-label="Abrir menú"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="text-sm text-muted-foreground hidden sm:block">
          {user?.fullName?.split(' ')[0]}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium text-gray-900 leading-tight">{user?.fullName}</span>
            {user?.role && <RoleBadge role={user.role} />}
          </div>
          <div className="w-8 h-8 rounded-full bg-rescue-50 text-rescue-600 flex items-center justify-center text-sm font-semibold">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
