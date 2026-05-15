import { Link } from 'react-router';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader } from './ui/card';
import { Progress } from './ui/progress';

const PHASE_LABELS: Record<string, string> = {
  PENDING: 'Aguardando início',
  VALIDATING_EVALUATORS: 'Validando avaliadores',
  COLLECTING: 'Coletando respostas',
  READY_FOR_CALIBRATION: 'Pronto para calibração',
  CALIBRATED: 'Calibrado',
  DEBRIEFED: 'Devolutiva realizada',
};

type CycleCardProps = {
  cycleSubjectId: string;
  cycleType: 'CF' | 'PR';
  cycleName: string | null;
  currentPhase: string;
  collectionDeadline: string | null;
  daysRemaining: number | null;
  responseRate: number;
  totalEvaluators: number;
  respondedEvaluators: number;
};

function DeadlineBadge({ daysRemaining }: { daysRemaining: number | null }) {
  if (daysRemaining === null) {
    return <span className="text-sm text-gray-400">Sem prazo definido</span>;
  }
  if (daysRemaining === 0) {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200">
        Prazo encerrado
      </Badge>
    );
  }
  return (
    <span className="text-sm text-gray-500">{daysRemaining} dias restantes</span>
  );
}

export function CycleCard({
  cycleSubjectId,
  cycleType,
  cycleName,
  currentPhase,
  daysRemaining,
  responseRate,
  totalEvaluators,
  respondedEvaluators,
}: CycleCardProps) {
  const isCF = cycleType === 'CF';
  const accentColor = isCF ? '#FF7C6B' : '#2D2A96';
  const phaseLabel = PHASE_LABELS[currentPhase] ?? currentPhase;
  const progressPercent = Math.round(responseRate * 100);

  return (
    <Card className="overflow-hidden shadow-sm">
      <div className="h-1 w-full" style={{ backgroundColor: accentColor }} />
      <CardHeader className="pb-2 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Badge
              className="w-fit text-white border-0"
              style={{ backgroundColor: accentColor }}
            >
              {isCF ? 'Feedback Contínuo' : 'Performance Review'}
            </Badge>
            {cycleName && (
              <h3 className="text-base font-semibold text-gray-800 mt-1">
                {cycleName}
              </h3>
            )}
          </div>
          <DeadlineBadge daysRemaining={daysRemaining} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pb-5">
        <p className="text-sm text-gray-500">
          Fase atual:{' '}
          <span className="font-medium text-gray-700">{phaseLabel}</span>
        </p>
        {currentPhase === 'VALIDATING_EVALUATORS' && (
          <Link
            to={`/ciclos/cf/${cycleSubjectId}/avaliadores`}
            className="inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-white border-0 w-fit"
            style={{ backgroundColor: '#FF7C6B' }}
          >
            Validar avaliadores
          </Link>
        )}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Respostas recebidas</span>
            <span>
              {respondedEvaluators} de {totalEvaluators}
            </span>
          </div>
          <Progress
            value={progressPercent}
            className="h-2"
            style={
              {
                '--progress-color': accentColor,
              } as React.CSSProperties
            }
          />
          <p className="text-xs text-gray-400 text-right">{progressPercent}%</p>
        </div>
      </CardContent>
    </Card>
  );
}
