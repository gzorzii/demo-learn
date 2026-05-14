import { CyclesDashboard } from '../components/CyclesDashboard';

export function MeusCiclosPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-black text-[#2D2A96]">Meus Ciclos</h1>
      <CyclesDashboard />
    </div>
  );
}
