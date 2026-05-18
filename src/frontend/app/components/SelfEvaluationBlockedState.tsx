import { Link } from 'react-router';

export function SelfEvaluationBlockedState() {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="text-4xl">⏳</div>
      <h2 className="text-xl font-semibold text-gray-800">Coleta ainda não iniciada</h2>
      <p className="text-sm text-gray-500 max-w-sm">
        A fase de coleta do seu ciclo CF ainda não começou. Você poderá preencher a
        autoavaliação quando o ciclo entrar na fase de coleta.
      </p>
      <Link
        to="/meus-ciclos"
        className="text-sm text-blue-600 hover:underline"
      >
        Voltar para Meus Ciclos
      </Link>
    </div>
  );
}
