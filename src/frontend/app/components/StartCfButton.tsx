import type { SelfEligibilityStatus, SelfImpedimentCode } from '../types/cycle';

type Props = {
  eligibility: SelfEligibilityStatus;
  onClick: () => void;
};

const IMPEDIMENT_TOOLTIP: Record<SelfImpedimentCode, string> = {
  CF_ALREADY_ACTIVE: 'Você já possui um CF ativo',
  PR_ALREADY_ACTIVE:
    'Você possui um PR ativo — aguarde o encerramento para iniciar CF',
  BLACKOUT_ACTIVE: 'Período de blackout ativo — CF não pode ser iniciado agora',
};

export function StartCfButton({ eligibility, onClick }: Props) {
  const { canStartCf, impedimentCode } = eligibility;
  const tooltip =
    !canStartCf && impedimentCode ? IMPEDIMENT_TOOLTIP[impedimentCode] : undefined;

  if (canStartCf) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-lg border-0 px-4 py-2 text-sm font-medium text-white transition"
        style={{ backgroundColor: '#FF7C6B' }}
      >
        Iniciar CF
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled
      title={tooltip}
      className="cursor-not-allowed rounded-lg border-0 px-4 py-2 text-sm font-medium text-white opacity-50"
      style={{ backgroundColor: '#9CA3AF' }}
    >
      Iniciar CF
    </button>
  );
}