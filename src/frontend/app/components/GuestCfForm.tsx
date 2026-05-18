import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { AiAlert } from './AiAlert';

interface GuestCfFormProps {
  subjectName: string;
  collectionDeadline: string;
  responseText: string;
  isSubmitting: boolean;
  submitError: string | null;
  showAiAlert: boolean;
  onTextChange: (text: string) => void;
  onBlur: () => void;
  onSubmit: () => void;
  onAiAlertDismiss: () => void;
  onAiAlertReview: () => void;
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function GuestCfForm({
  subjectName,
  collectionDeadline,
  responseText,
  isSubmitting,
  submitError,
  showAiAlert,
  onTextChange,
  onBlur,
  onSubmit,
  onAiAlertDismiss,
  onAiAlertReview,
}: GuestCfFormProps) {
  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-[#2D2A96]">
          Avaliação de Continuous Feedback
        </h1>
        <p className="text-base text-gray-600">
          Avaliando: <span className="font-semibold text-gray-800">{subjectName}</span>
        </p>
      </div>

      <p className="text-sm text-gray-500">
        Prazo de coleta:{' '}
        <span className="font-medium text-gray-700">{formatDeadline(collectionDeadline)}</span>
      </p>

      <div className="flex flex-col gap-2">
        <label htmlFor="response-text" className="text-sm font-medium text-gray-700">
          Sua avaliação
        </label>
        <Textarea
          id="response-text"
          placeholder="Descreva situações concretas, exemplos de comportamentos e impactos observados..."
          value={responseText}
          onChange={e => onTextChange(e.target.value)}
          onBlur={onBlur}
          className="min-h-48"
          disabled={isSubmitting}
        />
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
      >
        {isSubmitting ? 'Enviando...' : 'Enviar avaliação'}
      </Button>
    </div>
  );
}
