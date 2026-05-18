import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import axios from 'axios';
import type { PdmCfProgressDTO } from '../types/cfProgress';
import { getPdmProgress } from '../services/cfProgressService';
import { EvaluationFormSkeleton } from '../components/EvaluationFormSkeleton';
import { EvaluationErrorState } from '../components/EvaluationErrorState';
import { CfProgressPanel } from '../components/CfProgressPanel';

export function PdmCfProgressPage() {
  const { colaboradorId, id } = useParams<{ colaboradorId: string; id: string }>();
  const [data, setData] = useState<PdmCfProgressDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<'NOT_FOUND' | 'FORBIDDEN' | 'SERVER_ERROR' | null>(null);

  async function load() {
    if (!colaboradorId || !id) return;
    setLoading(true);
    setApiError(null);
    try {
      setData(await getPdmProgress(colaboradorId, id));
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

  useEffect(() => { load(); }, [colaboradorId, id]);

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
        selfActionUrl={null}
        pdmActionUrl={`/meu-time/${colaboradorId}/cf/${id}/avaliar`}
        guestEvaluators={data.guestEvaluators}
      />
    </div>
  );
}
