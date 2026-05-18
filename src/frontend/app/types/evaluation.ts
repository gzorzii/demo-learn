export type EvaluationState =
  | 'OPEN'
  | 'ALREADY_SUBMITTED'
  | 'DEADLINE_EXPIRED'
  | 'CYCLE_CLOSED';

export type EvaluationContextDTO = {
  subjectName: string;
  cycleSubjectId: string;
  collectionDeadline: string;
  evaluationState: EvaluationState;
  alreadySubmittedAt: string | null;
  draftText: string | null;
};

export type PendingEvaluationItem = {
  cycleEvaluatorId: string;
  subjectName: string;
  collectionDeadline: string;
};

export type EvaluationErrorCode =
  | 'ALREADY_SUBMITTED'
  | 'DEADLINE_EXPIRED'
  | 'CYCLE_CLOSED';

export const AI_ALERT_MIN_CHARS = 100;
export const AI_ALERT_CONTEXT_WORDS = [
  'quando', 'exemplo', 'situação', 'projeto', 'entregou',
  'ajudou', 'demonstrou', 'fez', 'resolveu', 'liderou',
  'when', 'example', 'situation', 'project', 'delivered',
  'helped', 'demonstrated', 'resolved', 'led',
];

export function needsAiAlert(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < AI_ALERT_MIN_CHARS) return true;
  const lower = trimmed.toLowerCase();
  return !AI_ALERT_CONTEXT_WORDS.some(word => lower.includes(word));
}

export type SelfEvaluationState =
  | 'OPEN'
  | 'ALREADY_SUBMITTED'
  | 'CYCLE_NOT_COLLECTING';

export type SelfEvaluationContextDTO = {
  subjectName: string;
  cycleSubjectId: string;
  collectionDeadline: string | null;
  evaluationState: SelfEvaluationState;
  submittedText: string | null;
  submittedAt: string | null;
  draftText: string | null;
};