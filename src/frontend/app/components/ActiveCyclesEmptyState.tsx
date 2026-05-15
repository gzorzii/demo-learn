import type { SelfEligibilityStatus, SelfImpedimentCode } from '../types/cycle';
import { StartCfButton } from './StartCfButton';

type Props = {
  eligibility?: SelfEligibilityStatus | null;
  onStartCf?: () => void;
  lastImpediment?: SelfImpedimentCode | null;
  blackoutEndsAt?: string | null;
};

const IMPEDIMENT_MESSAGE: Record<SelfImpedimentCode, string> = {
  CF_ALREADY_ACTIVE: 'Você já possui um CF ativo',
  PR_ALREADY_ACTIVE:
    'Você possui um PR ativo — aguarde o encerramento para iniciar CF',
  BLACKOUT_ACTIVE: 'Período de blackout ativo — CF não pode ser iniciado agora',
};

function formatBlackoutDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function buildImpedimentMessage(
  code: SelfImpedimentCode,
  blackoutEndsAt: string | null | undefined,
): string {
  if (code === 'BLACKOUT_ACTIVE' && blackoutEndsAt) {
    return `Período de blackout ativo até ${formatBlackoutDate(blackoutEndsAt)}`;
  }
  return IMPEDIMENT_MESSAGE[code];
}

export function ActiveCyclesEmptyState({
  eligibility,
  onStartCf,
  lastImpediment,
  blackoutEndsAt,
}: Props) {
  const showButton = eligibility != null && onStartCf != null;

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-[#F8F9FA] px-8 py-16 text-center">
      <p className="text-base font-semibold text-gray-600">
        Nenhum ciclo ativo no momento
      </p>
      <p className="max-w-sm text-sm text-gray-400">
        Quando um ciclo de avaliação for iniciado para você, ele aparecerá aqui.
      </p>
      {showButton && (
        <StartCfButton eligibility={eligibility} onClick={onStartCf} />
      )}
      {lastImpediment != null && (
        <p className="max-w-sm text-sm text-amber-600">
          {buildImpedimentMessage(lastImpediment, blackoutEndsAt)}
        </p>
      )}
    </div>
  );
}