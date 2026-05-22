import React from 'react';
import { EmptyState } from '../components/EmptyState';
import { Construction } from 'lucide-react';

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center">
      <EmptyState
        icon={<Construction className="w-8 h-8" />}
        title={title}
        description="Esta vista forma parte del esqueleto del prototipo y será implementada en la siguiente fase."
      />
    </div>
  );
}
