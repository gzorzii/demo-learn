import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { AiAlert } from './AiAlert';

type PdmAiAlertState = {
  resultado: boolean;
  prontidao: boolean;
  action: boolean;
};

type Props = {
  subjectName: string;
  collectionDeadline: string | null;
  resultado: string;
  prontidao: string;
  action: string;
  isSubmitting: boolean;
  draftSaving: boolean;
  draftError: boolean;
  submitError: string | null;
  aiAlerts: PdmAiAlertState;
  onResultadoChange: (text: string) => void;
  onProntidaoChange: (text: string) => void;
  onActionChange: (text: string) => void;
  onResultadoBlur: () => void;
  onProntidaoBlur: () => void;
  onActionBlur: () => void;
  onSubmit: () => void;
  onAiAlertDismiss: (field: 'resultado' | 'prontidao' | 'action') => void;
  onAiAlertReview: (field: 'resultado' | 'prontidao' | 'action') => void;
};

function DraftIndicator({ saving, error }: { saving: boolean; error: boolean }) {
  if (error) {
    return (
      <p className="text-xs text-red-500" role="status">
        Erro ao salvar rascunho
      </p>
    );
  }
  if (saving) {
    return (
      <p className="text-xs text-gray-400" role="status">
        Salvando...
      </p>
    );
  }
  return (
    <p className="text-xs text-gray-400" role="status">
      Salvo
    </p>
  );
}

type EvaluationFieldProps = {
  id: string;
  label: string;
  value: string;
  isSubmitting: boolean;
  showAiAlert: boolean;
  onChange: (text: string) => void;
  onBlur: () => void;
  onAiAlertDismiss: () => void;
  onAiAlertReview: () => void;
};

function EvaluationField({
  id,
  label,
  value,
  isSubmitting,
  showAiAlert,
  onChange,
  onBlur,
  onAiAlertDismiss,
  onAiAlertReview,
}: EvaluationFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <Textarea
        id={id}
        placeholder="Descreva situações concretas, exemplos de comportamentos e impactos observados..."
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        className="min-h-36"
        disabled={isSubmitting}
      />
      {showAiAlert && (
        <AiAlert onDismiss={onAiAlertDismiss} onReview={onAiAlertReview} />
      )}
    </div>
  );
}

export function PdmCfForm({
  subjectName,
  collectionDeadline,
  resultado,
  prontidao,
  action,
  isSubmitting,
  draftSaving,
  draftError,
  submitError,
  aiAlerts,
  onResultadoChange,
  onProntidaoChange,
  onActionChange,
  onResultadoBlur,
  onProntidaoBlur,
  onActionBlur,
  onSubmit,
  onAiAlertDismiss,
  onAiAlertReview,
}: Props) {
  const hasContent =
    resultado.trim().length > 0 ||
    prontidao.trim().length > 0 ||
    action.trim().length > 0;

  const canSubmit =
    resultado.trim().length > 0 &&
    prontidao.trim().length > 0 &&
    action.trim().length > 0 &&
    !isSubmitting;

  const formattedDeadline = collectionDeadline
    ? new Date(collectionDeadline).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-[#FF7C6B]">
          Avaliação de {subjectName}
        </h1>
        {formattedDeadline && (
          <p className="text-sm text-gray-500">
            Prazo para envio: <strong>{formattedDeadline}</strong>
          </p>
        )}
      </div>

      <p className="text-sm text-gray-600">
        Preencha os três campos abaixo com exemplos concretos e situações reais
        observadas no período do ciclo.
      </p>

      <EvaluationField
        id="pdm-resultado"
        label="Resultado"
        value={resultado}
        isSubmitting={isSubmitting}
        showAiAlert={aiAlerts.resultado}
        onChange={onResultadoChange}
        onBlur={onResultadoBlur}
        onAiAlertDismiss={() => onAiAlertDismiss('resultado')}
        onAiAlertReview={() => onAiAlertReview('resultado')}
      />

      <EvaluationField
        id="pdm-prontidao"
        label="Prontidão"
        value={prontidao}
        isSubmitting={isSubmitting}
        showAiAlert={aiAlerts.prontidao}
        onChange={onProntidaoChange}
        onBlur={onProntidaoBlur}
        onAiAlertDismiss={() => onAiAlertDismiss('prontidao')}
        onAiAlertReview={() => onAiAlertReview('prontidao')}
      />

      <EvaluationField
        id="pdm-action"
        label="Action"
        value={action}
        isSubmitting={isSubmitting}
        showAiAlert={aiAlerts.action}
        onChange={onActionChange}
        onBlur={onActionBlur}
        onAiAlertDismiss={() => onAiAlertDismiss('action')}
        onAiAlertReview={() => onAiAlertReview('action')}
      />

      {hasContent && (
        <div className="flex justify-end">
          <DraftIndicator saving={draftSaving} error={draftError} />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="w-fit text-white border-0"
          style={{ backgroundColor: '#FF7C6B' }}
        >
          {isSubmitting ? 'Enviando...' : 'Enviar avaliação'}
        </Button>
        {submitError && (
          <p className="text-sm text-red-600" role="alert">
            {submitError}
          </p>
        )}
      </div>
    </div>
  );
}
