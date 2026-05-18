import { Link } from 'react-router';
import { Badge } from './ui/badge';

type GuestEvaluator = {
  name: string;
  responded: boolean;
};

type Props = {
  cycleStatus: string;
  selfEvaluationStatus: "PENDING" | "SUBMITTED";
  pdmEvaluationStatus: "PENDING" | "RESPONDED";
  guestTotal: number;
  guestResponded: number;
  collectionDeadline: string | null;
  daysRemaining: number | null;
  selfActionUrl: string | null;
  pdmActionUrl: string | null;
  guestEvaluators: GuestEvaluator[] | null;
  onCloseCycle: (() => void) | null;
};

function StatusIcon({ done }: { done: boolean }) {
  if (done) {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
        </svg>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-100 text-yellow-600 shrink-0">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
      </svg>
    </span>
  );
}

function ActionLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-white border-0 w-fit"
      style={{ backgroundColor: '#FF7C6B' }}
    >
      {label}
    </Link>
  );
}

export function CfProgressPanel({
  cycleStatus,
  selfEvaluationStatus,
  pdmEvaluationStatus,
  guestTotal,
  guestResponded,
  daysRemaining,
  selfActionUrl,
  pdmActionUrl,
  guestEvaluators,
  onCloseCycle,
}: Props) {
  const isCollecting = cycleStatus === 'COLLECTING';

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {!isCollecting && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
          <p className="text-sm text-blue-700">O ciclo CF não está em fase de coleta.</p>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-gray-800">Status das avaliações</h2>

        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <StatusIcon done={selfEvaluationStatus === 'SUBMITTED'} />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">
                Autoavaliação
                {selfEvaluationStatus === 'SUBMITTED'
                  ? ' — Enviada'
                  : ' — Pendente'}
              </span>
              {selfEvaluationStatus === 'PENDING' && isCollecting && selfActionUrl && (
                <ActionLink to={selfActionUrl} label="Submeter autoavaliação" />
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <StatusIcon done={pdmEvaluationStatus === 'RESPONDED'} />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">
                Avaliação do PDM
                {pdmEvaluationStatus === 'RESPONDED'
                  ? ' — Enviada'
                  : ' — Pendente'}
              </span>
              {pdmEvaluationStatus === 'PENDING' && isCollecting && pdmActionUrl && (
                <ActionLink to={pdmActionUrl} label="Submeter avaliação" />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-gray-800">Convidados</h2>
        {guestEvaluators === null ? (
          guestTotal === 0 ? (
            <p className="text-sm text-gray-500">Nenhum convidado adicionado.</p>
          ) : (
            <p className="text-sm text-gray-600">
              <span className="font-medium">{guestResponded}</span> de{' '}
              <span className="font-medium">{guestTotal}</span> convidados responderam.
            </p>
          )
        ) : guestEvaluators.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum convidado adicionado.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {guestEvaluators.map((g) => (
              <li key={g.name} className="flex items-center gap-3">
                <StatusIcon done={g.responded} />
                <span className="text-sm text-gray-700">{g.name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-gray-800">Prazo</h2>
        {daysRemaining === null ? (
          <p className="text-sm text-gray-400">Sem prazo definido.</p>
        ) : daysRemaining === 0 ? (
          <Badge className="bg-red-100 text-red-700 border-red-200 w-fit">
            Prazo encerrado
          </Badge>
        ) : (
          <p className="text-sm text-gray-600">{daysRemaining} dias restantes.</p>
        )}
      </section>

      {onCloseCycle !== null && (
        <div>
          <button
            type="button"
            onClick={onCloseCycle}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
          >
            Encerrar CF
          </button>
        </div>
      )}
    </div>
  );
}
