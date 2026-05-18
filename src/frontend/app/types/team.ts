export type ActiveCycleSummary = {
  cycleType: 'CF' | 'PR';
  cycleStatus: string;
  cycleSubjectId: string | null;
};

export type EligibilityStatus = {
  canStartCf: boolean;
  impedimentCode: 'CF_ALREADY_ACTIVE' | 'PR_ALREADY_ACTIVE' | 'BLACKOUT_ACTIVE' | null;
};

export type TeamMemberDTO = {
  userId: string;
  name: string;
  email: string;
  activeCycle: ActiveCycleSummary | null;
  eligibility: EligibilityStatus;
};

export type TeamMembersResponse = {
  teamMembers: TeamMemberDTO[];
};
