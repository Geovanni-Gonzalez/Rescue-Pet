import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Cargando...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 w-full h-full min-h-[50vh]">
      <Loader2 className="w-10 h-10 text-rescue-500 animate-spin mb-4" />
      <p className="text-gray-500 font-medium">{message}</p>
    </div>
  );
}
