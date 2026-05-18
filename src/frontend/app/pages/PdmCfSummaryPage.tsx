import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import axios from 'axios';
import { EvaluationFormSkeleton } from '../components/EvaluationFormSkeleton';
import { EvaluationErrorState } from '../components/EvaluationErrorState';
import { CfNotClosedState } from '../components/CfNotClosedState';
import { CfSummaryPanel } from '../components/CfSummaryPanel';
import { getPdmSummary } from '../services/cfSummaryService';
import type { PdmCfSummaryDTO } from '../types/cfSummary';

type ApiError = 'NOT_FOUND' | 'FORBIDDEN' | 'SERVER_ERROR';

export function PdmCfSummaryPage() {
  const { colaboradorId, id } = useParams<{ colaboradorId: string; id: string }>();
  const [summaryData, setSummaryData] = useState<PdmCfSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<ApiError | null>(null);

  function load() {
    if (!colaboradorId || !id) return;
    setLoading(true);
    setApiError(null);
    getPdmSummary(colaboradorId, id)
      .then((data) => {
        setSummaryData(data);
      })
      .catch((err) => {
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 403) {
            setApiError('FORBIDDEN');
          } else if (err.response?.status === 404) {
            setApiError('NOT_FOUND');
          } else {
            setApiError('SERVER_ERROR');
          }
        } else {
          setApiError('SERVER_ERROR');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, [colaboradorId, id]);

  if (loading) {
    return <EvaluationFormSkeleton />;
  }

  if (apiError) {
    return (
      <EvaluationErrorState
        errorType={apiError}
        onRetry={apiError === 'SERVER_ERROR' ? load : undefined}
      />
    );
  }

  if (!summaryData) {
    return null;
  }

  if (summaryData.cycleStatus !== 'CLOSED') {
    return <CfNotClosedState cycleStatus={summaryData.cycleStatus} />;
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-xl font-semibold text-gray-800 mb-6">Resumo do Ciclo</h1>
      <CfSummaryPanel
        variant="pdm"
        selfEvaluation={summaryData.selfEvaluation}
        pdmEvaluation={summaryData.pdmEvaluation}
        guestRespondentCount={summaryData.guestRespondentCount}
        guestResponses={null}
        guestMinimumNotReached={null}
        guestEvaluations={summaryData.guestEvaluations}
        aiSummary={summaryData.aiSummary}
      />
    </div>
  );
}