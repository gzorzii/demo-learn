type Props = {
  validationDeadline: string;
  validatedAt: string | null;
};

function formatDatePtBR(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function computeDaysUntil(dateStr: string): number {
  const deadline = new Date(dateStr);
  deadline.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function ValidationDeadlineBanner({ validationDeadline, validatedAt }: Props) {
  if (validatedAt !== null) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
          Lista confirmada em {formatDatePtBR(validatedAt)}
        </span>
      </div>
    );
  }

  const daysUntil = computeDaysUntil(validationDeadline);

  if (daysUntil < 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <svg
          className="h-4 w-4 flex-shrink-0 text-amber-600"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-sm text-amber-800">
          O prazo de validação encerrou. Avaliadores selecionados automaticamente.
        </p>
      </div>
    );
  }

  if (daysUntil === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
        <p className="text-sm font-medium text-orange-800">O prazo encerra hoje.</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
      <p className="text-sm text-blue-800">
        Você tem{' '}
        <span className="font-semibold">{daysUntil} {daysUntil === 1 ? 'dia' : 'dias'}</span>{' '}
        para validar a lista de avaliadores.
      </p>
    </div>
  );
}
