import type { EvaluationState } from '../types/evaluation';

type EvaluationBlockedReason = Exclude<EvaluationState, 'OPEN'>;

interface EvaluationBlockedStateProps {
  reason: EvaluationBlockedReason;
  submittedAt?: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EvaluationBlockedState({ reason, submittedAt }: EvaluationBlockedStateProps) {
  const config: Record<EvaluationBlockedReason, { title: string; message: string }> = {
    ALREADY_SUBMITTED: {
      title: 'Avaliação já enviada',
      message: submittedAt
        ? `Você já enviou sua avaliação em ${formatDate(submittedAt)}. Obrigado pela participação.`
        : 'Você já enviou sua avaliação. Obrigado pela participação.',
    },
    DEADLINE_EXPIRED: {
      title: 'Prazo encerrado',
      message: 'O prazo de 10 dias para responder esta avaliação encerrou.',
    },
    CYCLE_CLOSED: {
      title: 'Ciclo encerrado',
      message: 'O ciclo de Continuous Feedback foi encerrado.',
    },
  };

  const { title, message } = config[reason];

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 max-w-md mx-auto text-center">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
}
