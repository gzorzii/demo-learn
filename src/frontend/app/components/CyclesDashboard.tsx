import { useEffect, useState } from 'react';
import { fetchActiveCycles } from '../services/cycleService';
import type { ActiveCycleDTO, SelfEligibilityStatus, SelfImpedimentCode } from '../types/cycle';
import { ActiveCyclesEmptyState } from './ActiveCyclesEmptyState';
import { Button } from './ui/button';
import { CycleCard } from './CycleCard';
import { CycleCardSkeleton } from './CycleCardSkeleton';

type CyclesDashboardProps = {
  userId?: string;
  refreshKey?: number;
  onStartCf?: () => void;
  lastImpediment?: SelfImpedimentCode | null;
  blackoutEndsAt?: string | null;
};

type FetchState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; cycles: ActiveCycleDTO[] };

function deriveEligibility(cycles: ActiveCycleDTO[]): SelfEligibilityStatus {
  if (cycles.some(c => c.cycleType === 'CF')) {
    return { canStartCf: false, impedimentCode: 'CF_ALREADY_ACTIVE' };
  }
  if (cycles.some(c => c.cycleType === 'PR')) {
    return { canStartCf: false, impedimentCode: 'PR_ALREADY_ACTIVE' };
  }
  return { canStartCf: true, impedimentCode: null };
}

export function CyclesDashboard({
  refreshKey,
  onStartCf,
  lastImpediment,
  blackoutEndsAt,
}: CyclesDashboardProps) {
  const [state, setState] = useState<FetchState>({ status: 'loading' });

  function load() {
    setState({ status: 'loading' });
    fetchActiveCycles()
      .then(data => setState({ status: 'success', cycles: data.cycles }))
      .catch(() =>
        setState({
          status: 'error',
          message: 'Não foi possível carregar os ciclos. Tente novamente.',
        })
      );
  }

  useEffect(() => {
    load();
  }, [refreshKey]);

  if (state.status === 'loading') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <CycleCardSkeleton />
        <CycleCardSkeleton />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-sm text-gray-500">{state.message}</p>
        <Button variant="outline" onClick={load}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (state.cycles.length === 0) {
    const eligibility = onStartCf != null ? deriveEligibility(state.cycles) : null;
    return (
      <ActiveCyclesEmptyState
        eligibility={eligibility}
        onStartCf={onStartCf}
        lastImpediment={lastImpediment}
        blackoutEndsAt={blackoutEndsAt}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {state.cycles.map(cycle => (
        <CycleCard
          key={cycle.cycleSubjectId}
          cycleSubjectId={cycle.cycleSubjectId}
          cycleType={cycle.cycleType}
          cycleName={cycle.cycleName}
          currentPhase={cycle.currentPhase}
          collectionDeadline={cycle.collectionDeadline}
          daysRemaining={cycle.daysRemaining}
          responseRate={cycle.responseRate}
          totalEvaluators={cycle.totalEvaluators}
          respondedEvaluators={cycle.respondedEvaluators}
        />
      ))}
    </div>
  );
}