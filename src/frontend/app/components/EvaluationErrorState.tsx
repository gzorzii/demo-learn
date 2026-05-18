import { Button } from './ui/button';

const ERROR_CONFIG = {
  NOT_FOUND: {
    title: 'Link inválido',
    description: 'Link inválido. Verifique se você usou o link correto.',
    showRetry: false,
  },
  FORBIDDEN: {
    title: 'Acesso negado',
    description: 'Você não tem permissão para acessar esta avaliação.',
    showRetry: false,
  },
  SERVER_ERROR: {
    title: 'Erro ao carregar',
    description: 'Erro ao carregar o formulário. Tente novamente.',
    showRetry: true,
  },
} as const;

interface EvaluationErrorStateProps {
  errorType: 'NOT_FOUND' | 'FORBIDDEN' | 'SERVER_ERROR';
  onRetry?: () => void;
}

export function EvaluationErrorState({ errorType, onRetry }: EvaluationErrorStateProps) {
  const config = ERROR_CONFIG[errorType];

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 max-w-md mx-auto text-center">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-gray-800">{config.title}</h2>
        <p className="text-sm text-gray-500">{config.description}</p>
      </div>
      {config.showRetry && onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
