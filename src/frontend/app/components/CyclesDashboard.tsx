import { useEffect, useState } from 'react';
import { fetchActiveCycles } from '../services/cycleService';
import type { ActiveCycleDTO } from '../types/cycle';
import { ActiveCyclesEmptyState } from './ActiveCyclesEmptyState';
import { Button } from './ui/button';
import { CycleCard } from './CycleCard';
import { CycleCardSkeleton } from './CycleCardSkeleton';

type CyclesDashboardProps = {
  // TODO: quando o endpoint GET /api/ciclos/ativos/{userId} existir para o PDM,
  // trocar a chamada de fetchActiveCycles() por fetchActiveCyclesForUser(userId)
  userId?: string;
};

type FetchState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; cycles: ActiveCycleDTO[] };

export function CyclesDashboard(_props: CyclesDashboardProps) {
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
  }, []);

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
    return <ActiveCyclesEmptyState />;
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
