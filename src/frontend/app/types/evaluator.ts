export type EvaluatorSource = 'ONA_SUGGESTION' | 'MANUAL_SUBJECT' | 'MANUAL_PDM';
export type EvaluatorType = 'SELF' | 'PDM' | 'PEER';

export type EvaluatorItem = {
  evaluatorId: string;
  userId: string;
  name: string;
  email: string;
  evaluatorType: EvaluatorType;
  isMandatory: boolean;
  source: EvaluatorSource;
  addedBy: string | null;
};

export type EvaluatorListResponse = {
  cycleSubjectId: string;
  validationDeadline: string;
  validatedAt: string | null;
  evaluators: EvaluatorItem[];
  guestCount: number;
  guestLimit: number;
};

export type EvaluatorErrorCode =
  | 'NOT_IN_VALIDATION_PHASE'
  | 'VALIDATION_DEADLINE_EXPIRED'
  | 'EVALUATOR_ALREADY_MANDATORY'
  | 'EVALUATOR_ALREADY_IN_LIST'
  | 'GUEST_LIMIT_REACHED'
  | 'CANNOT_REMOVE_MANDATORY_EVALUATOR';

export const EVALUATOR_ERROR_MESSAGES: Record<EvaluatorErrorCode, string> = {
  NOT_IN_VALIDATION_PHASE: 'Este ciclo não está mais na fase de validação de avaliadores',
  VALIDATION_DEADLINE_EXPIRED: 'O prazo de validação expirou. Os avaliadores foram selecionados automaticamente',
  EVALUATOR_ALREADY_MANDATORY: 'Este avaliador já faz parte da lista como avaliador obrigatório',
  EVALUATOR_ALREADY_IN_LIST: 'Este avaliador já está na lista',
  GUEST_LIMIT_REACHED: 'Limite de 10 avaliadores convidados atingido',
  CANNOT_REMOVE_MANDATORY_EVALUATOR: 'Avaliadores obrigatórios não podem ser removidos',
};

export const SOURCE_LABELS: Record<EvaluatorSource, string> = {
  ONA_SUGGESTION: 'Sugerido pelo ONA',
  MANUAL_SUBJECT: 'Adicionado por você',
  MANUAL_PDM: 'Adicionado pelo gestor',
};
