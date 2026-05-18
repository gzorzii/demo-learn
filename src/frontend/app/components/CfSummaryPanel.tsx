import type {
  GuestEvaluationDetailDTO,
  PdmEvaluationSummaryDTO,
  SelfEvaluationSummaryDTO,
} from '../types/cfSummary';

type CfSummaryPanelProps = {
  variant: 'colaborador' | 'pdm';
  selfEvaluation: SelfEvaluationSummaryDTO | null;
  pdmEvaluation: PdmEvaluationSummaryDTO | null;
  guestRespondentCount: number | null;
  guestResponses: string[] | null;
  guestMinimumNotReached: boolean | null;
  guestEvaluations: GuestEvaluationDetailDTO[] | null;
  aiSummary: string | null;
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 flex flex-col gap-3">
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      {children}
    </div>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return <p className="text-sm text-gray-400 italic">{message}</p>;
}

function SelfEvaluationSection({ selfEvaluation }: { selfEvaluation: SelfEvaluationSummaryDTO | null }) {
  return (
    <SectionCard title="Autoavaliação">
      {selfEvaluation ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-700 whitespace-pre-line">{selfEvaluation.responseText}</p>
          <p className="text-xs text-gray-400">Enviada em {formatDate(selfEvaluation.submittedAt)}</p>
        </div>
      ) : (
        <EmptyMessage message="Autoavaliação não submetida" />
      )}
    </SectionCard>
  );
}

function PdmEvaluationSection({ pdmEvaluation }: { pdmEvaluation: PdmEvaluationSummaryDTO | null }) {
  return (
    <SectionCard title="Avaliação do PDM">
      {pdmEvaluation ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Resultado</span>
            <p className="text-sm text-gray-700">{pdmEvaluation.resultado}</p>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Prontidão</span>
            <p className="text-sm text-gray-700">{pdmEvaluation.prontidao}</p>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Action</span>
            <p className="text-sm text-gray-700">{pdmEvaluation.action}</p>
          </div>
          <p className="text-xs text-gray-400">Enviada em {formatDate(pdmEvaluation.submittedAt)}</p>
        </div>
      ) : (
        <EmptyMessage message="Avaliação do PDM não disponível" />
      )}
    </SectionCard>
  );
}

function GuestFeedbacksColaboradorSection({
  guestRespondentCount,
  guestResponses,
  guestMinimumNotReached,
}: {
  guestRespondentCount: number | null;
  guestResponses: string[] | null;
  guestMinimumNotReached: boolean | null;
}) {
  if (guestMinimumNotReached === true) {
    return (
      <SectionCard title="Feedbacks dos Convidados">
        <p className="text-sm text-gray-500">
          Número mínimo de respondentes não atingido para exibição{' '}
          <span className="font-medium text-gray-700">
            ({guestRespondentCount ?? 0} de 3 necessários)
          </span>
        </p>
      </SectionCard>
    );
  }

  const responses = guestResponses ?? [];

  return (
    <SectionCard title="Feedbacks dos Convidados">
      {responses.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {responses.map((text, index) => (
            <li key={index} className="rounded-md bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-line">
              {text}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyMessage message="Nenhum convidado respondeu" />
      )}
    </SectionCard>
  );
}

function GuestFeedbacksPdmSection({
  guestEvaluations,
}: {
  guestEvaluations: GuestEvaluationDetailDTO[] | null;
}) {
  const evaluations = guestEvaluations ?? [];

  return (
    <SectionCard title="Feedbacks dos Convidados">
      {evaluations.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {evaluations.map((evaluation, index) => (
            <li key={index} className="rounded-md bg-gray-50 p-3 flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-600">{evaluation.evaluatorName}</span>
              <p className="text-sm text-gray-700 whitespace-pre-line">{evaluation.responseText}</p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyMessage message="Nenhum convidado respondeu" />
      )}
    </SectionCard>
  );
}

export function CfSummaryPanel({
  variant,
  selfEvaluation,
  pdmEvaluation,
  guestRespondentCount,
  guestResponses,
  guestMinimumNotReached,
  guestEvaluations,
  aiSummary,
}: CfSummaryPanelProps) {
  return (
    <div className="flex flex-col gap-5">
      <SelfEvaluationSection selfEvaluation={selfEvaluation} />
      <PdmEvaluationSection pdmEvaluation={pdmEvaluation} />
      {variant === 'colaborador' ? (
        <GuestFeedbacksColaboradorSection
          guestRespondentCount={guestRespondentCount}
          guestResponses={guestResponses}
          guestMinimumNotReached={guestMinimumNotReached}
        />
      ) : (
        <GuestFeedbacksPdmSection guestEvaluations={guestEvaluations} />
      )}
      {aiSummary !== null && (
        <SectionCard title="Sumário de IA">
          <p className="text-sm text-gray-700 whitespace-pre-line">{aiSummary}</p>
        </SectionCard>
      )}
    </div>
  );
}