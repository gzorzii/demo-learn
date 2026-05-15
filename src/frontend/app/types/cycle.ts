export type SelfImpedimentCode =
  | 'CF_ALREADY_ACTIVE'
  | 'PR_ALREADY_ACTIVE'
  | 'BLACKOUT_ACTIVE';

export type SelfEligibilityStatus = {
  canStartCf: boolean;
  impedimentCode: SelfImpedimentCode | null;
};

export type StartCfErrorResponse = {
  errorCode: SelfImpedimentCode;
  blackoutEndsAt?: string | null;
};

export type ActiveCycleDTO = {
  cycleSubjectId: string;
  cycleId: string;
  cycleType: 'CF' | 'PR';
  cycleName: string | null;
  currentPhase: string;
  collectionDeadline: string | null;
  daysRemaining: number | null;
  responseRate: number;
  totalEvaluators: number;
  respondedEvaluators: number;
};

export type ActiveCyclesResponse = {
  cycles: ActiveCycleDTO[];
};
