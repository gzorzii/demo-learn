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
