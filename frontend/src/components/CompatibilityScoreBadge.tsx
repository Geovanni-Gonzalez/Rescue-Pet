
interface CompatibilityScoreBadgeProps {
  score: number | null;
}

export function CompatibilityScoreBadge({ score }: CompatibilityScoreBadgeProps) {
  if (score === null || score === undefined) return null;

  const colorClass =
    score >= 80
      ? 'bg-warm-50 text-warm-700 border-warm-100'
      : score >= 50
        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
        : 'bg-gray-100 text-gray-600 border-gray-200';

  return (
    <div className={`px-2 py-1 text-xs font-bold rounded border ${colorClass} flex items-center justify-center`}>
      {score}% Afinidad
    </div>
  );
}
