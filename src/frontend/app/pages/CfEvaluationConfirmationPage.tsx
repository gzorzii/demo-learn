import { CheckCircle } from 'lucide-react';

export function CfEvaluationConfirmationPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center max-w-md mx-auto p-6">
      <CheckCircle className="size-16 text-green-500" />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-[#2D2A96]">
          Avaliação enviada com sucesso!
        </h1>
        <p className="text-sm text-gray-500">
          Obrigado por participar. Seu feedback foi registrado.
        </p>
      </div>
    </div>
  );
}
