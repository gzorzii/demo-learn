import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router';
import axios from 'axios';
import type { SelfEvaluationContextDTO } from '../types/evaluation';
import { needsAiAlert } from '../types/evaluation';
import { getSelfEvaluationContext, saveSelfDraft, submitSelfEvaluation } from '../services/selfEvaluationService';
import { EvaluationFormSkeleton } from '../components/EvaluationFormSkeleton';
import { EvaluationErrorState } from '../components/EvaluationErrorState';
import { SelfEvaluationBlockedState } from '../components/SelfEvaluationBlockedState';
import { SelfEvaluationReadOnlyView } from '../components/SelfEvaluationReadOnlyView';
import { SelfCfForm } from '../components/SelfCfForm';

export function CfSelfEvaluationPage() {
  const { id } = useParams<{ id: string }>();

  const [data, setData] = useState<SelfEvaluationContextDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<'NOT_FOUND' | 'SERVER_ERROR' | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showAiAlert, setShowAiAlert] = useState(false);
  const [aiAlertDismissed, setAiAlertDismissed] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftError, setDraftError] = useState(false);

  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadContext() {
    if (!id) return;
    setLoading(true);
    setApiError(null);
    try {
      const ctx = await getSelfEvaluationContext(id);
      setData(ctx);
      if (ctx.draftText && ctx.evaluationState === 'OPEN') {
        setResponseText(ctx.draftText);
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 404 || status === 403) {
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
  }, [id]);

  useEffect(() => {
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, []);

  function handleTextChange(text: string) {
    setResponseText(text);

    if (aiAlertDismissed) {
      setAiAlertDismissed(false);
      setShowAiAlert(false);
    }

    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
    }

    if (id) {
      setDraftSaving(true);
      setDraftError(false);
      draftTimerRef.current = setTimeout(() => {
        saveSelfDraft(id, text)
          .then(() => setDraftSaving(false))
          .catch(() => {
            setDraftSaving(false);
            setDraftError(true);
          });
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
    if (!id) return;

    if (!aiAlertDismissed && needsAiAlert(responseText)) {
      setShowAiAlert(true);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
      draftTimerRef.current = null;
    }

    try {
      await submitSelfEvaluation(id, responseText);
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

  if (data.evaluationState === 'CYCLE_NOT_COLLECTING') {
    return (
      <div className="p-6">
        <SelfEvaluationBlockedState />
      </div>
    );
  }

  if (data.evaluationState === 'ALREADY_SUBMITTED') {
    return (
      <div className="p-6">
        <SelfEvaluationReadOnlyView
          submittedText={data.submittedText ?? ''}
          submittedAt={data.submittedAt ?? ''}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <SelfCfForm
        responseText={responseText}
        isSubmitting={isSubmitting}
        draftSaving={draftSaving}
        draftError={draftError}
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
