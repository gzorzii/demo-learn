import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { AiAlert } from './AiAlert';

type SelfCfFormProps = {
  responseText: string;
  isSubmitting: boolean;
  draftSaving: boolean;
  draftError: boolean;
  submitError: string | null;
  showAiAlert: boolean;
  onTextChange: (text: string) => void;
  onBlur: () => void;
  onSubmit: () => void;
  onAiAlertDismiss: () => void;
  onAiAlertReview: () => void;
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

export function SelfCfForm({
  responseText,
  isSubmitting,
  draftSaving,
  draftError,
  submitError,
  showAiAlert,
  onTextChange,
  onBlur,
  onSubmit,
  onAiAlertDismiss,
  onAiAlertReview,
}: SelfCfFormProps) {
  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-[#FF7C6B]">Autoavaliação</h1>
        <p className="text-sm text-gray-500">
          Descreva seu desempenho recente, com exemplos concretos e situações específicas.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="self-response-text" className="text-sm font-medium text-gray-700">
          Sua autoavaliação
        </label>
        <Textarea
          id="self-response-text"
          placeholder="Descreva situações concretas, exemplos de comportamentos e impactos observados..."
          value={responseText}
          onChange={e => onTextChange(e.target.value)}
          onBlur={onBlur}
          className="min-h-48"
          disabled={isSubmitting}
        />
        {responseText.trim().length > 0 && (
          <div className="flex justify-end">
            <DraftIndicator saving={draftSaving} error={draftError} />
          </div>
        )}
        {showAiAlert && (
          <AiAlert onDismiss={onAiAlertDismiss} onReview={onAiAlertReview} />
        )}
        {submitError && (
          <p className="text-sm text-red-600" role="alert">
            {submitError}
          </p>
        )}
      </div>

      <Button
        onClick={onSubmit}
        disabled={isSubmitting || responseText.trim().length === 0}
        className="w-fit"
        style={{ backgroundColor: '#FF7C6B', borderColor: '#FF7C6B' }}
      >
        {isSubmitting ? 'Enviando...' : 'Enviar autoavaliação'}
      </Button>
    </div>
  );
}
