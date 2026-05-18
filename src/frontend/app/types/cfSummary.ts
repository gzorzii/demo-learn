export type SelfEvaluationSummaryDTO = {
  responseText: string;
  submittedAt: string;
};

export type PdmEvaluationSummaryDTO = {
  resultado: string;
  prontidao: string;
  action: string;
  submittedAt: string;
};

export type GuestEvaluationDetailDTO = {
  evaluatorName: string;
  responseText: string;
};

export type CfSummaryDTO = {
  cycleSubjectId: string;
  cycleStatus: string;
  selfEvaluation: SelfEvaluationSummaryDTO | null;
  pdmEvaluation: PdmEvaluationSummaryDTO | null;
  guestRespondentCount: number | null;
  guestResponses: string[] | null;
  guestMinimumNotReached: boolean | null;
  aiSummary: string | null;
};

export type PdmCfSummaryDTO = {
  cycleSubjectId: string;
  cycleStatus: string;
  selfEvaluation: SelfEvaluationSummaryDTO | null;
  pdmEvaluation: PdmEvaluationSummaryDTO | null;
  guestRespondentCount: number | null;
  guestEvaluations: GuestEvaluationDetailDTO[] | null;
  aiSummary: string | null;
};