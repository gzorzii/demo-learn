import type { EvaluatorItem } from '../types/evaluator';
import { EvaluatorCard } from './EvaluatorCard';

type Props = {
  evaluators: EvaluatorItem[];
  canRemove: boolean;
  removingEvaluatorId: string | null;
  removeError: string | null;
  onRemove: (evaluatorId: string) => void;
};

export function EvaluatorList({
  evaluators,
  canRemove,
  removingEvaluatorId,
  removeError,
  onRemove,
}: Props) {
  if (evaluators.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">
        Nenhum avaliador na lista ainda.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {evaluators.map(ev => (
        <EvaluatorCard
          key={ev.evaluatorId}
          evaluatorId={ev.evaluatorId}
          userId={ev.userId}
          name={ev.name}
          email={ev.email}
          evaluatorType={ev.evaluatorType}
          isMandatory={ev.isMandatory}
          source={ev.source}
          canRemove={canRemove}
          isRemoving={removingEvaluatorId === ev.evaluatorId}
          removeError={removingEvaluatorId === ev.evaluatorId ? removeError : null}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
