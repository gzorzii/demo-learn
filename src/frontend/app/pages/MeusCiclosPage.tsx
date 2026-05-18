import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router';
import { CyclesDashboard } from '../components/CyclesDashboard';
import { StartSelfCfModal } from '../components/StartSelfCfModal';
import { startSelfCf } from '../services/cycleService';
import { listPendingEvaluations } from '../services/evaluationFormService';
import type { SelfImpedimentCode, StartCfErrorResponse } from '../types/cycle';
import type { PendingEvaluationItem } from '../types/evaluation';
import { Card, CardContent } from '../components/ui/card';

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function MeusCiclosPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastImpediment, setLastImpediment] = useState<SelfImpedimentCode | null>(null);
  const [blackoutEndsAt, setBlackoutEndsAt] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingEvaluations, setPendingEvaluations] = useState<PendingEvaluationItem[]>([]);

  useEffect(() => {
    listPendingEvaluations()
      .then(setPendingEvaluations)
      .catch(() => {});
  }, []);

  function handleOpenModal() {
    setLastImpediment(null);
    setBlackoutEndsAt(null);
    setIsModalOpen(true);
  }

  async function handleConfirm() {
    setIsSubmitting(true);
    try {
      await startSelfCf();
      setIsModalOpen(false);
      setRefreshKey(k => k + 1);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const data = err.response.data as StartCfErrorResponse;
        setLastImpediment(data.errorCode);
        setBlackoutEndsAt(data.blackoutEndsAt ?? null);
        setIsModalOpen(false);
        setRefreshKey(k => k + 1);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    setIsModalOpen(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-black text-[#2D2A96]">Meus Ciclos</h1>

      {pendingEvaluations.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-gray-800">Avaliações pendentes</h2>
          <div className="flex flex-col gap-3">
            {pendingEvaluations.map(item => (
              <Card key={item.cycleEvaluatorId} className="shadow-sm">
                <div className="h-1 w-full bg-[#FF7C6B]" />
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-gray-800">{item.subjectName}</span>
                    <span className="text-xs text-gray-500">
                      Prazo: {formatDeadline(item.collectionDeadline)}
                    </span>
                  </div>
                  <Link
                    to={`/avaliar/cf/${item.cycleEvaluatorId}`}
                    className="inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-white border-0 shrink-0"
                    style={{ backgroundColor: '#FF7C6B' }}
                  >
                    Responder avaliação
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <CyclesDashboard
        refreshKey={refreshKey}
        onStartCf={handleOpenModal}
        lastImpediment={lastImpediment}
        blackoutEndsAt={blackoutEndsAt}
      />
      <StartSelfCfModal
        isOpen={isModalOpen}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}