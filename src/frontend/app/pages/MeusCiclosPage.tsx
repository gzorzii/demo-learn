import { useState } from 'react';
import axios from 'axios';
import { CyclesDashboard } from '../components/CyclesDashboard';
import { StartSelfCfModal } from '../components/StartSelfCfModal';
import { startSelfCf } from '../services/cycleService';
import type { SelfImpedimentCode, StartCfErrorResponse } from '../types/cycle';

export function MeusCiclosPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastImpediment, setLastImpediment] = useState<SelfImpedimentCode | null>(null);
  const [blackoutEndsAt, setBlackoutEndsAt] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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