import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';

interface AiAlertProps {
  onDismiss: () => void;
  onReview: () => void;
}

export function AiAlert({ onDismiss, onReview }: AiAlertProps) {
  return (
    <Alert className="border-amber-200 bg-amber-50">
      <AlertTriangle className="text-amber-600" />
      <AlertTitle className="text-amber-800">Sua avaliação pode ser mais específica</AlertTitle>
      <AlertDescription className="text-amber-700">
        <p>
          Avaliações com exemplos concretos e situações reais são mais úteis para o avaliado.
          Considere incluir contexto sobre o que aconteceu, quando e como ele(a) atuou.
        </p>
        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100" onClick={onReview}>
            Revisar texto
          </Button>
          <Button size="sm" variant="ghost" className="text-amber-700 hover:bg-amber-100" onClick={onDismiss}>
            Enviar assim mesmo
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
