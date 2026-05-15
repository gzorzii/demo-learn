import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router';
import axios from 'axios';
import type { EvaluatorListResponse, EvaluatorErrorCode } from '../types/evaluator';
import { EVALUATOR_ERROR_MESSAGES } from '../types/evaluator';
import {
  fetchEvaluators,
  fetchEvaluatorsForPdm,
  addEvaluator,
  addEvaluatorForPdm,
  removeEvaluator,
  confirmEvaluators,
} from '../services/evaluatorService';
import { ValidationDeadlineBanner } from '../components/ValidationDeadlineBanner';
import { EvaluatorList } from '../components/EvaluatorList';
import { EvaluatorListSkeleton } from '../components/EvaluatorListSkeleton';
import { AddEvaluatorModal } from '../components/AddEvaluatorModal';
import { ConfirmEvaluatorsModal } from '../components/ConfirmEvaluatorsModal';

type PageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: EvaluatorListResponse };

function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const code = err.response?.data?.errorCode as EvaluatorErrorCode | undefined;
    if (code && code in EVALUATOR_ERROR_MESSAGES) {
      return EVALUATOR_ERROR_MESSAGES[code];
    }
    return err.response?.data?.message ?? 'Ocorreu um erro inesperado.';
  }
  return 'Ocorreu um erro inesperado.';
}

export function CfEvaluatorsPage() {
  const { id: cycleSubjectId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const subjectId = searchParams.get('subjectId');
  const isPdmView = subjectId !== null;

  const [pageState, setPageState] = useState<PageState>({ status: 'loading' });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [removingEvaluatorId, setRemovingEvaluatorId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [addApiError, setAddApiError] = useState<string | null>(null);
  const [confirmApiError, setConfirmApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!cycleSubjectId) return;

    setPageState({ status: 'loading' });

    const request =
      isPdmView && subjectId
        ? fetchEvaluatorsForPdm(subjectId, cycleSubjectId)
        : fetchEvaluators(cycleSubjectId);

    request
      .then(data => setPageState({ status: 'success', data }))
      .catch(() =>
        setPageState({
          status: 'error',
          message: 'Não foi possível carregar os avaliadores. Tente novamente.',
        })
      );
  }, [cycleSubjectId, isPdmView, subjectId]);

  if (!cycleSubjectId) {
    return (
      <p className="text-sm text-red-600">Ciclo não encontrado.</p>
    );
  }

  async function handleAdd(userId: string) {
    setIsAdding(true);
    setAddApiError(null);
    try {
      const newEvaluator =
        isPdmView && subjectId
          ? await addEvaluatorForPdm(subjectId, cycleSubjectId!, userId)
          : await addEvaluator(cycleSubjectId!, userId);

      setPageState(prev => {
        if (prev.status !== 'success') return prev;
        return {
          status: 'success',
          data: {
            ...prev.data,
            evaluators: [...prev.data.evaluators, newEvaluator],
            guestCount: prev.data.guestCount + 1,
          },
        };
      });
      setIsAddModalOpen(false);
    } catch (err) {
      setAddApiError(extractErrorMessage(err));
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemove(evaluatorId: string) {
    setRemovingEvaluatorId(evaluatorId);
    setRemoveError(null);
    try {
      await removeEvaluator(cycleSubjectId!, evaluatorId);
      setPageState(prev => {
        if (prev.status !== 'success') return prev;
        return {
          status: 'success',
          data: {
            ...prev.data,
            evaluators: prev.data.evaluators.filter(e => e.evaluatorId !== evaluatorId),
            guestCount: prev.data.guestCount - 1,
          },
        };
      });
    } catch (err) {
      setRemoveError(extractErrorMessage(err));
    } finally {
      setRemovingEvaluatorId(null);
    }
  }

  async function handleConfirm() {
    setIsConfirming(true);
    setConfirmApiError(null);
    try {
      await confirmEvaluators(cycleSubjectId!);
      navigate('/meus-ciclos');
    } catch (err) {
      setConfirmApiError(extractErrorMessage(err));
    } finally {
      setIsConfirming(false);
    }
  }

  if (pageState.status === 'loading') {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link
            to="/meus-ciclos"
            className="text-sm text-[#2D2A96] hover:underline"
          >
            ← Meus Ciclos
          </Link>
        </div>
        <h1 className="text-2xl font-black text-[#2D2A96]">Avaliadores do CF</h1>
        <EvaluatorListSkeleton />
      </div>
    );
  }

  if (pageState.status === 'error') {
    return (
      <div className="flex flex-col gap-6">
        <Link to="/meus-ciclos" className="text-sm text-[#2D2A96] hover:underline">
          ← Meus Ciclos
        </Link>
        <h1 className="text-2xl font-black text-[#2D2A96]">Avaliadores do CF</h1>
        <p className="text-sm text-red-600">{pageState.message}</p>
      </div>
    );
  }

  const { data } = pageState;
  const isExpired = new Date(data.validationDeadline) < new Date();
  const canRemove = !isPdmView && !isExpired && data.validatedAt === null;
  const canAdd =
    !isExpired && data.guestCount < data.guestLimit && data.validatedAt === null;
  const canConfirm = !isPdmView && !isExpired && data.validatedAt === null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          to="/meus-ciclos"
          className="text-sm text-[#2D2A96] hover:underline"
        >
          ← Meus Ciclos
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-black text-[#2D2A96]">Avaliadores do CF</h1>
        <div className="flex items-center gap-3 flex-wrap">
          {canAdd && (
            <button
              type="button"
              onClick={() => {
                setAddApiError(null);
                setIsAddModalOpen(true);
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Adicionar avaliador
            </button>
          )}
          {canConfirm && (
            <button
              type="button"
              onClick={() => {
                setConfirmApiError(null);
                setIsConfirmModalOpen(true);
              }}
              className="rounded-lg border-0 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              style={{ backgroundColor: '#FF7C6B' }}
            >
              Confirmar lista
            </button>
          )}
        </div>
      </div>

      <ValidationDeadlineBanner
        validationDeadline={data.validationDeadline}
        validatedAt={data.validatedAt}
      />

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          {data.evaluators.length}{' '}
          {data.evaluators.length === 1 ? 'avaliador' : 'avaliadores'} na lista
        </span>
        <span>
          Convidados: {data.guestCount}/{data.guestLimit}
        </span>
      </div>

      <EvaluatorList
        evaluators={data.evaluators}
        canRemove={canRemove}
        removingEvaluatorId={removingEvaluatorId}
        removeError={removeError}
        onRemove={handleRemove}
      />

      <AddEvaluatorModal
        isOpen={isAddModalOpen}
        isSubmitting={isAdding}
        apiError={addApiError}
        onAdd={handleAdd}
        onCancel={() => setIsAddModalOpen(false)}
      />

      <ConfirmEvaluatorsModal
        isOpen={isConfirmModalOpen}
        isSubmitting={isConfirming}
        totalEvaluators={data.evaluators.length}
        apiError={confirmApiError}
        onConfirm={handleConfirm}
        onCancel={() => setIsConfirmModalOpen(false)}
      />
    </div>
  );
}
