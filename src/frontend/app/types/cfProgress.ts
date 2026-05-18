export type GuestEvaluatorStatusDTO = {
  name: string;
  responded: boolean;
};

export type CfProgressDTO = {
  cycleSubjectId: string;
  cycleStatus: string;
  selfEvaluationStatus: "PENDING" | "SUBMITTED";
  pdmEvaluationStatus: "PENDING" | "RESPONDED";
  guestTotal: number;
  guestResponded: number;
  collectionDeadline: string | null;
  daysRemaining: number | null;
};

export type PdmCfProgressDTO = CfProgressDTO & {
  guestEvaluators: GuestEvaluatorStatusDTO[];
};
