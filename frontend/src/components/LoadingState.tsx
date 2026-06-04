import { PawPrint } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Cargando...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 w-full min-h-[40vh]">
      <div className="relative w-12 h-12 mb-4">
        <div className="absolute inset-0 rounded-full bg-rescue-100 animate-ping opacity-30" />
        <div className="relative w-12 h-12 bg-rescue-50 text-rescue-600 rounded-full flex items-center justify-center">
          <PawPrint className="w-6 h-6" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
