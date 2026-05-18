type Props = {
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmCloseModal({
  isOpen,
  isLoading,
  error,
  onConfirm,
  onCancel,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden="true"
        onClick={isLoading ? undefined : onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-close-modal-title"
        className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h2
          id="confirm-close-modal-title"
          className="text-lg font-bold text-[#2D2A96]"
        >
          Encerrar ciclo CF
        </h2>
        <p className="mt-3 text-sm text-gray-600">
          Esta ação é irreversível. O ciclo CF será encerrado e não poderá ser reaberto.
        </p>
        {error !== null && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className="flex items-center gap-2 rounded-lg border-0 px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-70"
            style={{ backgroundColor: '#FF7C6B' }}
          >
            {isLoading && (
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
            )}
            Confirmar encerramento
          </button>
        </div>
      </div>
    </div>
  );
}