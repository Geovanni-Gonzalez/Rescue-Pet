import React from 'react';

interface CompatibilityScoreBadgeProps {
  score: number | null;
}

export function CompatibilityScoreBadge({ score }: CompatibilityScoreBadgeProps) {
  if (score === null || score === undefined) return null;

  let colorClass = 'bg-gray-100 text-gray-800 border-gray-200';
  
  if (score >= 80) colorClass = 'bg-green-100 text-green-800 border-green-200';
  else if (score >= 50) colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
  else colorClass = 'bg-red-100 text-red-800 border-red-200';

  return (
    <div className={`px-2 py-1 text-xs font-bold rounded border ${colorClass} flex items-center justify-center`}>
      {score}% Afinidad
    </div>
  );
}
