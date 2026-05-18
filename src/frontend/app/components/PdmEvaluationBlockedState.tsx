import { Link } from 'react-router';

type Props = {
  reason: 'CYCLE_NOT_COLLECTING' | 'DEADLINE_EXPIRED';
  subjectName: string;
};

export function PdmEvaluationBlockedState({ reason, subjectName }: Props) {
  const title =
    reason === 'DEADLINE_EXPIRED' ? 'Prazo encerrado' : 'Coleta não iniciada';
  const description =
    reason === 'DEADLINE_EXPIRED'
      ? `O prazo de coleta do ciclo CF de ${subjectName} encerrou. Não é mais possível enviar avaliações.`
      : `O ciclo CF de ${subjectName} ainda não está na fase de coleta. Você poderá preencher a avaliação quando a coleta for iniciada.`;

  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="text-4xl">
        {reason === 'DEADLINE_EXPIRED' ? '⏰' : '⏳'}
      </div>
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      <p className="text-sm text-gray-500 max-w-sm">{description}</p>
      <Link to="/meu-time" className="text-sm text-blue-600 hover:underline">
        Voltar para Meu Time
      </Link>
    </div>
  );
}
