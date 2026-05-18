import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router';
import axios from 'axios';
import type { PdmEvaluationContextDTO } from '../types/pdmEvaluation';
import { needsAiAlert } from '../types/evaluation';
import {
  getPdmEvaluationContext,
  savePdmDraft,
  submitPdmEvaluation,
} from '../services/pdmEvaluationService';
import { EvaluationFormSkeleton } from '../components/EvaluationFormSkeleton';
import { EvaluationErrorState } from '../components/EvaluationErrorState';
import { PdmEvaluationBlockedState } from '../components/PdmEvaluationBlockedState';
import { PdmEvaluationReadOnlyView } from '../components/PdmEvaluationReadOnlyView';
import { PdmCfForm } from '../components/PdmCfForm';

type ApiError = 'NOT_FOUND' | 'FORBIDDEN' | 'SERVER_ERROR';
type BlockedReason = 'CYCLE_NOT_COLLECTING' | 'DEADLINE_EXPIRED';

type AiAlertState = {
  resultado: boolean;
  prontidao: boolean;
  action: boolean;
};

type AiAlertDismissedState = {
  resultado: boolean;
  prontidao: boolean;
  action: boolean;
};

export function PdmCfEvaluationPage() {
  const { colaboradorId, id } = useParams<{ colaboradorId: string; id: string }>();

  const [data, setData] = useState<PdmEvaluationContextDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [resultado, setResultado] = useState('');
  const [prontidao, setProntidao] = useState('');
  const [action, setAction] = useState('');
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftError, setDraftError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [aiAlerts, setAiAlerts] = useState<AiAlertState>({
    resultado: false,
    prontidao: false,
    action: false,
  });
  const [aiAlertsDismissed, setAiAlertsDismissed] = useState<AiAlertDismissedState>({
    resultado: false,
    prontidao: false,
    action: false,
  });
  const [blockedReason, setBlockedReason] = useState<BlockedReason | null>(null);

  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadContext() {
    if (!colaboradorId || !id) return;
    setLoading(true);
    setApiError(null);
    try {
      const ctx = await getPdmEvaluationContext(colaboradorId, id);
      setData(ctx);
      setResultado(ctx.draft?.resultadoDraft ?? '');
      setProntidao(ctx.draft?.prontidaoDraft ?? '');
      setAction(ctx.draft?.actionDraft ?? '');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 403) {
          setApiError('FORBIDDEN');
        } else if (status === 404) {
          setApiError('NOT_FOUND');
        } else {
          setApiError('SERVER_ERROR');
        }
      } else {
        setApiError('SERVER_ERROR');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContext();
  }, [colaboradorId, id]);

  useEffect(() => {
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, []);

  function scheduleDraftSave(res: string, pron: string, act: string) {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    if (!colaboradorId || !id) return;
    setDraftSaving(true);
    setDraftError(false);
    draftTimerRef.current = setTimeout(() => {
      savePdmDraft(colaboradorId, id, res, pron, act)
        .then(() => setDraftSaving(false))
        .catch(() => {
          setDraftSaving(false);
          setDraftError(true);
        });
    }, 1000);
  }

  function handleResultadoChange(text: string) {
    setResultado(text);
    scheduleDraftSave(text, prontidao, action);
  }

  function handleProntidaoChange(text: string) {
    setProntidao(text);
    scheduleDraftSave(resultado, text, action);
  }

  function handleActionChange(text: string) {
    setAction(text);
    scheduleDraftSave(resultado, prontidao, text);
  }

  function handleBlur(field: 'resultado' | 'prontidao' | 'action', value: string) {
    if (!aiAlertsDismissed[field] && value.trim().length > 0) {
      setAiAlerts(prev => ({ ...prev, [field]: needsAiAlert(value) }));
    }
  }

  function handleAiAlertDismiss(field: 'resultado' | 'prontidao' | 'action') {
    setAiAlertsDismissed(prev => ({ ...prev, [field]: true }));
    setAiAlerts(prev => ({ ...prev, [field]: false }));
  }

  function handleAiAlertReview(field: 'resultado' | 'prontidao' | 'action') {
    setAiAlerts(prev => ({ ...prev, [field]: false }));
  }

  async function handleSubmit() {
    if (!colaboradorId || !id) return;

    const fields = [
      { key: 'resultado' as const, value: resultado },
      { key: 'prontidao' as const, value: prontidao },
      { key: 'action' as const, value: action },
    ];

    let hasAlert = false;
    const nextAlerts = { ...aiAlerts };
    for (const { key, value } of fields) {
      if (!aiAlertsDismissed[key] && needsAiAlert(value)) {
        nextAlerts[key] = true;
        hasAlert = true;
      }
    }

    if (hasAlert) {
      setAiAlerts(nextAlerts);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
      draftTimerRef.current = null;
    }

    try {
      await submitPdmEvaluation(colaboradorId, id, resultado, prontidao, action);
      setIsSubmitting(false);
      await loadContext();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const errorCode = err.response.data?.errorCode as string | undefined;
        if (errorCode === 'ALREADY_SUBMITTED' || errorCode === 'CYCLE_NOT_COLLECTING') {
          setIsSubmitting(false);
          await loadContext();
          return;
        }
        if (errorCode === 'DEADLINE_EXPIRED') {
          setIsSubmitting(false);
          setBlockedReason('DEADLINE_EXPIRED');
          return;
        }
      }
      setSubmitError('Erro ao enviar. Tente novamente.');
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <EvaluationFormSkeleton />
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="p-6">
        <EvaluationErrorState
          errorType={apiError}
          onRetry={apiError === 'SERVER_ERROR' ? loadContext : undefined}
        />
      </div>
    );
  }

  if (!data) return null;

  const effectiveBlockedReason: BlockedReason | null =
    blockedReason ??
    (data.evaluationState === 'CYCLE_NOT_COLLECTING'
      ? 'CYCLE_NOT_COLLECTING'
      : data.evaluationState === 'DEADLINE_EXPIRED'
        ? 'DEADLINE_EXPIRED'
        : null);

  if (effectiveBlockedReason) {
    return (
      <div className="p-6">
        <PdmEvaluationBlockedState
          reason={effectiveBlockedReason}
          subjectName={data.subjectName}
        />
      </div>
    );
  }

  if (data.evaluationState === 'ALREADY_SUBMITTED' && data.response) {
    return (
      <div className="p-6">
        <PdmEvaluationReadOnlyView
          subjectName={data.subjectName}
          resultado={data.response.resultado}
          prontidao={data.response.prontidao}
          action={data.response.action}
          submittedAt={data.response.submittedAt}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <PdmCfForm
        subjectName={data.subjectName}
        collectionDeadline={data.collectionDeadline}
        resultado={resultado}
        prontidao={prontidao}
        action={action}
        isSubmitting={isSubmitting}
        draftSaving={draftSaving}
        draftError={draftError}
        submitError={submitError}
        aiAlerts={aiAlerts}
        onResultadoChange={handleResultadoChange}
        onProntidaoChange={handleProntidaoChange}
        onActionChange={handleActionChange}
        onResultadoBlur={() => handleBlur('resultado', resultado)}
        onProntidaoBlur={() => handleBlur('prontidao', prontidao)}
        onActionBlur={() => handleBlur('action', action)}
        onSubmit={handleSubmit}
        onAiAlertDismiss={handleAiAlertDismiss}
        onAiAlertReview={handleAiAlertReview}
      />
    </div>
  );
}
