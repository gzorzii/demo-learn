type Props = { submittedText: string; submittedAt: string };

export function SelfEvaluationReadOnlyView({ submittedText, submittedAt }: Props) {
  const formattedDate = new Date(submittedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-[#FF7C6B]">Autoavaliação</h1>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-green-600 font-semibold">Autoavaliação enviada</span>
        <span className="text-sm text-gray-500">em {formattedDate}</span>
      </div>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{submittedText}</p>
      </div>
      <p className="text-xs text-gray-400">Esta avaliação não pode ser alterada.</p>
    </div>
  );
}
