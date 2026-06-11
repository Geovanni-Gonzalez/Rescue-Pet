import { Alert } from './ui/alert';

interface CompatibilityExplanationProps {
  explanation: string | null;
}

export function CompatibilityExplanation({ explanation }: CompatibilityExplanationProps) {
  if (!explanation) return null;

  return (
    <Alert variant="info" className="mt-3">
      {explanation}
    </Alert>
  );
}
