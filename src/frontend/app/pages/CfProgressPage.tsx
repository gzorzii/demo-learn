import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import axios from 'axios';
import type { CfProgressDTO } from '../types/cfProgress';
import { getColaboradorProgress, closeCfCycle } from '../services/cfProgressService';
import { EvaluationFormSkeleton } from '../components/EvaluationFormSkeleton';
import { EvaluationErrorState } from '../components/EvaluationErrorState';
import { CfProgressPanel } from '../components/CfProgressPanel';
import { ConfirmCloseModal } from '../components/ConfirmCloseModal';

export function CfProgressPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<CfProgressDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<'NOT_FOUND' | 'FORBIDDEN' | 'SERVER_ERROR' | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    setApiError(null);
    try {
      setData(await getColaboradorProgress(id));
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 404) setApiError('NOT_FOUND');
        else if (status === 403) setApiError('FORBIDDEN');
        else setApiError('SERVER_ERROR');
      } else {
        setApiError('SERVER_ERROR');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCloseCycle() {
    if (!id) return;
    setIsClosing(true);
    setCloseError(null);
    try {
      await closeCfCycle(id);
      navigate(`/ciclos/cf/${id}/resumo`);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setCloseError('Este ciclo CF já foi encerrado.');
      } else {
        setCloseError('Ocorreu um erro ao encerrar o ciclo. Tente novamente.');
      }
    } finally {
      setIsClosing(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="p-6"><EvaluationFormSkeleton /></div>;
  if (apiError) return (
    <div className="p-6">
      <EvaluationErrorState
        errorType={apiError}
        onRetry={apiError === 'SERVER_ERROR' ? load : undefined}
      />
    </div>
  );
  if (!data) return null;

  const onCloseCycle =
    data &&
    (data.initiatedBy === 'MANUAL_SUBJECT' || data.initiatedBy === 'MANUAL_PDM') &&
    data.cycleStatus === 'COLLECTING'
      ? () => setShowConfirmModal(true)
      : null;

  return (
    <div className="p-6">
      <CfProgressPanel
        cycleStatus={data.cycleStatus}
        selfEvaluationStatus={data.selfEvaluationStatus}
        pdmEvaluationStatus={data.pdmEvaluationStatus}
        guestTotal={data.guestTotal}
        guestResponded={data.guestResponded}
        collectionDeadline={data.collectionDeadline}
        daysRemaining={data.daysRemaining}
        selfActionUrl={`/ciclos/cf/${id}/autoavaliacao`}
        pdmActionUrl={null}
        guestEvaluators={null}
        onCloseCycle={onCloseCycle}
      />
      <ConfirmCloseModal
        isOpen={showConfirmModal}
        isLoading={isClosing}
        error={closeError}
        onConfirm={handleCloseCycle}
        onCancel={() => { setShowConfirmModal(false); setCloseError(null); }}
      />
    </div>
  );
}
