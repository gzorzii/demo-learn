import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import axios from 'axios';
import type { EvaluationContextDTO, EvaluationState } from '../types/evaluation';
import { needsAiAlert } from '../types/evaluation';
import { getEvaluationContext, saveDraft, submitEvaluation } from '../services/evaluationFormService';
import { EvaluationFormSkeleton } from '../components/EvaluationFormSkeleton';
import { EvaluationBlockedState } from '../components/EvaluationBlockedState';
import { EvaluationErrorState } from '../components/EvaluationErrorState';
import { GuestCfForm } from '../components/GuestCfForm';

type BlockedReason = Exclude<EvaluationState, 'OPEN'>;

export function CfEvaluationFormPage() {
  const { evaluatorId } = useParams<{ evaluatorId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<EvaluationContextDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<'NOT_FOUND' | 'SERVER_ERROR' | null>(null);
  const [blockedReason, setBlockedReason] = useState<BlockedReason | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showAiAlert, setShowAiAlert] = useState(false);
  const [aiAlertDismissed, setAiAlertDismissed] = useState(false);

  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadContext() {
    if (!evaluatorId) return;
    setLoading(true);
    setApiError(null);
    try {
      const ctx = await getEvaluationContext(evaluatorId);
      setData(ctx);
      if (ctx.evaluationState !== 'OPEN') {
        setBlockedReason(ctx.evaluationState as BlockedReason);
      }
      if (ctx.draftText) {
        setResponseText(ctx.draftText);
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setApiError('NOT_FOUND');
      } else {
        setApiError('SERVER_ERROR');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContext();
  }, [evaluatorId]);

  function handleTextChange(text: string) {
    setResponseText(text);

    if (aiAlertDismissed) {
      setAiAlertDismissed(false);
      setShowAiAlert(false);
    }

    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
    }

    if (evaluatorId) {
      draftTimerRef.current = setTimeout(() => {
        saveDraft(evaluatorId, text).catch(() => {});
      }, 1000);
    }
  }

  function handleBlur() {
    if (!aiAlertDismissed && responseText.trim().length > 0) {
      setShowAiAlert(needsAiAlert(responseText));
    }
  }

  function handleAiAlertDismiss() {
    setAiAlertDismissed(true);
    setShowAiAlert(false);
  }

  function handleAiAlertReview() {
    setShowAiAlert(false);
  }

  async function handleSubmit() {
    if (!evaluatorId) return;

    if (!aiAlertDismissed && needsAiAlert(responseText)) {
      setShowAiAlert(true);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await submitEvaluation(evaluatorId, responseText);
      navigate(`/avaliar/cf/${evaluatorId}/confirmacao`);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const errorCode = err.response.data?.errorCode as BlockedReason | undefined;
        if (errorCode) {
          setBlockedReason(errorCode);
          return;
        }
      }
      setSubmitError('Erro ao enviar. Tente novamente.');
    } finally {
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

  if (blockedReason) {
    return (
      <div className="p-6">
        <EvaluationBlockedState
          reason={blockedReason}
          submittedAt={data?.alreadySubmittedAt}
        />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6">
      <GuestCfForm
        subjectName={data.subjectName}
        collectionDeadline={data.collectionDeadline}
        responseText={responseText}
        isSubmitting={isSubmitting}
        submitError={submitError}
        showAiAlert={showAiAlert}
        onTextChange={handleTextChange}
        onBlur={handleBlur}
        onSubmit={handleSubmit}
        onAiAlertDismiss={handleAiAlertDismiss}
        onAiAlertReview={handleAiAlertReview}
      />
    </div>
  );
}
