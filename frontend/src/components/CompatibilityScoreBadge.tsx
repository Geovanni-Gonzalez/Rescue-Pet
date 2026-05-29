
interface CompatibilityScoreBadgeProps {
  score: number | null;
}

export function CompatibilityScoreBadge({ score }: CompatibilityScoreBadgeProps) {
  if (score === null || score === undefined) return null;

  const colorClass =
    score >= 80
      ? 'bg-green-100 text-green-800 border-green-200'
      : score >= 50
        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
        : 'bg-red-100 text-red-800 border-red-200';

  return (
    <div className={`px-2 py-1 text-xs font-bold rounded border ${colorClass} flex items-center justify-center`}>
      {score}% Afinidad
    </div>
  );
}
