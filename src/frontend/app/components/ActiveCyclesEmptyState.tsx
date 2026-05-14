export function ActiveCyclesEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-[#F8F9FA] px-8 py-16 text-center">
      <p className="text-base font-semibold text-gray-600">
        Nenhum ciclo ativo no momento
      </p>
      <p className="max-w-sm text-sm text-gray-400">
        Quando um ciclo de avaliação for iniciado para você, ele aparecerá aqui.
      </p>
    </div>
  );
}
