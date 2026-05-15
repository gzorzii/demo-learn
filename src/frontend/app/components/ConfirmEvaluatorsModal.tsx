type Props = {
  isOpen: boolean;
  isSubmitting: boolean;
  totalEvaluators: number;
  apiError: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export function ConfirmEvaluatorsModal({
  isOpen,
  isSubmitting,
  totalEvaluators,
  apiError,
  onConfirm,
  onCancel,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden="true"
        onClick={isSubmitting ? undefined : onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-evaluators-modal-title"
        className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h2
          id="confirm-evaluators-modal-title"
          className="text-lg font-bold text-[#2D2A96]"
        >
          Confirmar lista de avaliadores
        </h2>
        <p className="mt-3 text-sm text-gray-600">
          Confirmar lista com{' '}
          <span className="font-semibold text-gray-800">
            {totalEvaluators} {totalEvaluators === 1 ? 'avaliador' : 'avaliadores'}
          </span>
          ? A coleta de feedback começará imediatamente.
        </p>
        {apiError && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {apiError}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="flex items-center gap-2 rounded-lg border-0 px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-70"
            style={{ backgroundColor: '#FF7C6B' }}
          >
            {isSubmitting && <Spinner />}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
