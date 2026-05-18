type ReadOnlyFieldProps = {
  label: string;
  value: string;
};

function ReadOnlyField({ label, value }: ReadOnlyFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </span>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{value}</p>
      </div>
    </div>
  );
}

type Props = {
  subjectName: string;
  resultado: string;
  prontidao: string;
  action: string;
  submittedAt: string;
};

export function PdmEvaluationReadOnlyView({
  subjectName,
  resultado,
  prontidao,
  action,
  submittedAt,
}: Props) {
  const formattedDate = new Date(submittedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-green-600">Avaliação enviada</h2>
        <p className="text-sm text-gray-500">
          Avaliação de <strong>{subjectName}</strong> enviada em {formattedDate}.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <ReadOnlyField label="Resultado" value={resultado} />
        <ReadOnlyField label="Prontidão" value={prontidao} />
        <ReadOnlyField label="Action" value={action} />
      </div>
      <p className="text-xs text-gray-400">Esta avaliação não pode ser alterada.</p>
    </div>
  );
}
