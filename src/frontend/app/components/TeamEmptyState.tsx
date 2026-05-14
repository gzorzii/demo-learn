export function TeamEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-[#F8F9FA] px-8 py-16 text-center">
      <p className="text-base font-semibold text-gray-600">
        Nenhum liderado cadastrado para o seu perfil.
      </p>
    </div>
  );
}
