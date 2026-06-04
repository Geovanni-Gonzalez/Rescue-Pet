import { EmptyState } from '../components/EmptyState';
import { Construction } from 'lucide-react';

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center">
      <EmptyState
        icon={<Construction className="w-8 h-8" />}
        title={title}
        description="Esta sección estará disponible próximamente."
      />
    </div>
  );
}
