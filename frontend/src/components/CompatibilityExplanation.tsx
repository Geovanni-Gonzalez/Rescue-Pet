import React from 'react';
import { Info } from 'lucide-react';

interface CompatibilityExplanationProps {
  explanation: string | null;
}

export function CompatibilityExplanation({ explanation }: CompatibilityExplanationProps) {
  if (!explanation) return null;

  return (
    <div className="flex gap-2 items-start p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-sm mt-3">
      <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
      <p className="text-gray-600 leading-snug">{explanation}</p>
    </div>
  );
}
