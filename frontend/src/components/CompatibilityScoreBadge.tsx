import { affinityClasses } from '../design/status';

interface CompatibilityScoreBadgeProps {
  score: number | null;
}

export function CompatibilityScoreBadge({ score }: CompatibilityScoreBadgeProps) {
  if (score === null || score === undefined) return null;

  return (
    <div className={`px-2 py-1 text-xs font-bold rounded border ${affinityClasses(score)} flex items-center justify-center`}>
      {score}% Afinidad
    </div>
  );
}
