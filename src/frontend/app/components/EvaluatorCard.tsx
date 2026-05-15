import type { EvaluatorSource, EvaluatorType } from '../types/evaluator';
import { SOURCE_LABELS } from '../types/evaluator';

type Props = {
  evaluatorId: string;
  userId: string;
  name: string;
  email: string;
  evaluatorType: EvaluatorType;
  isMandatory: boolean;
  source: EvaluatorSource;
  canRemove: boolean;
  isRemoving: boolean;
  removeError: string | null;
  onRemove: (evaluatorId: string) => void;
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

export function EvaluatorCard({
  evaluatorId,
  name,
  email,
  isMandatory,
  source,
  canRemove,
  isRemoving,
  removeError,
  onRemove,
}: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-[#F8F9FA] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-800 truncate">{name}</span>
            {isMandatory && (
              <span className="inline-flex items-center rounded-full bg-[#2D2A96]/10 px-2 py-0.5 text-xs font-medium text-[#2D2A96]">
                Obrigatório
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500 truncate">{email}</span>
          <span className="text-xs text-gray-400">{SOURCE_LABELS[source]}</span>
        </div>
        {canRemove && !isMandatory && (
          <button
            type="button"
            disabled={isRemoving}
            onClick={() => onRemove(evaluatorId)}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRemoving ? <Spinner /> : null}
            Remover
          </button>
        )}
      </div>
      {removeError && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {removeError}
        </p>
      )}
    </div>
  );
}
