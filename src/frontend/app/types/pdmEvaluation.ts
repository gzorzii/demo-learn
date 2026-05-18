export type PdmEvaluationState =
  | 'OPEN'
  | 'ALREADY_SUBMITTED'
  | 'CYCLE_NOT_COLLECTING'
  | 'DEADLINE_EXPIRED';

export type PdmDraftDTO = {
  resultadoDraft: string | null;
  prontidaoDraft: string | null;
  actionDraft: string | null;
};

export type PdmResponseDTO = {
  resultado: string;
  prontidao: string;
  action: string;
  submittedAt: string;
};

export type PdmEvaluationContextDTO = {
  cycleEvaluatorId: string;
  cycleSubjectId: string;
  subjectName: string;
  collectionDeadline: string | null;
  evaluatorStatus: 'PENDING' | 'RESPONDED' | 'SKIPPED';
  evaluationState: PdmEvaluationState;
  draft: PdmDraftDTO | null;
  response: PdmResponseDTO | null;
};
