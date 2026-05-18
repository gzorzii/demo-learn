import { Link } from 'react-router';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import type { ActiveCycleSummary, EligibilityStatus } from '../types/team';

const IMPEDIMENT_LABELS: Record<string, string> = {
  CF_ALREADY_ACTIVE: 'CF já ativo para este colaborador',
  PR_ALREADY_ACTIVE: 'PR ativo para este colaborador — aguarde o encerramento',
  BLACKOUT_ACTIVE: 'Período de blackout ativo — CF não pode ser iniciado agora',
};

type Props = {
  userId: string;
  name: string;
  email: string;
  activeCycle: ActiveCycleSummary | null;
  eligibility: EligibilityStatus;
  lastError: string | null;
  onStartCf: () => void;
};

export function TeamMemberCard({
  userId,
  name,
  email,
  activeCycle,
  eligibility,
  lastError,
  onStartCf,
}: Props) {
  const impedimentLabel = eligibility.impedimentCode
    ? IMPEDIMENT_LABELS[eligibility.impedimentCode]
    : undefined;

  const errorLabel = lastError ? IMPEDIMENT_LABELS[lastError] : null;

  return (
    <Card className="overflow-hidden shadow-sm">
      <div className="h-1 w-full" style={{ backgroundColor: '#2D2A96' }} />
      <CardHeader className="pb-2 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-gray-800">{name}</h3>
            <p className="text-sm text-gray-500">{email}</p>
          </div>
          {activeCycle && (
            <Badge
              className="w-fit shrink-0 border-0 text-white"
              style={{
                backgroundColor:
                  activeCycle.cycleType === 'CF' ? '#FF7C6B' : '#2D2A96',
              }}
            >
              {activeCycle.cycleType} — {activeCycle.cycleStatus}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pb-5">
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!eligibility.canStartCf}
            title={impedimentLabel}
            onClick={onStartCf}
            className="text-white border-0"
            style={{ backgroundColor: '#FF7C6B' }}
          >
            Iniciar CF
          </Button>
          {activeCycle?.cycleType === 'CF' &&
            activeCycle?.cycleStatus === 'COLLECTING' &&
            activeCycle?.cycleSubjectId && (
              <Link
                to={`/meu-time/${userId}/cf/${activeCycle.cycleSubjectId}`}
                className="inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-white border-0 w-fit"
                style={{ backgroundColor: '#FF7C6B' }}
              >
                Avaliar CF
              </Link>
            )}
        </div>
        {errorLabel && (
          <p className="text-sm text-red-600">{errorLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}
