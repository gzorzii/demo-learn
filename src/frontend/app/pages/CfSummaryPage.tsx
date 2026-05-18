import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import axios from 'axios';
import { EvaluationFormSkeleton } from '../components/EvaluationFormSkeleton';
import { EvaluationErrorState } from '../components/EvaluationErrorState';
import { CfNotClosedState } from '../components/CfNotClosedState';
import { CfSummaryPanel } from '../components/CfSummaryPanel';
import { getColaboradorSummary } from '../services/cfSummaryService';
import type { CfSummaryDTO } from '../types/cfSummary';

type ApiError = 'NOT_FOUND' | 'FORBIDDEN' | 'SERVER_ERROR';

export function CfSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const [summaryData, setSummaryData] = useState<CfSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<ApiError | null>(null);

  function load() {
    if (!id) return;
    setLoading(true);
    setApiError(null);
    getColaboradorSummary(id)
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
  }, [id]);

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
        variant="colaborador"
        selfEvaluation={summaryData.selfEvaluation}
        pdmEvaluation={summaryData.pdmEvaluation}
        guestRespondentCount={summaryData.guestRespondentCount}
        guestResponses={summaryData.guestResponses}
        guestMinimumNotReached={summaryData.guestMinimumNotReached}
        guestEvaluations={null}
        aiSummary={summaryData.aiSummary}
      />
    </div>
  );
}