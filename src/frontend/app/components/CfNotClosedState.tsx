type CfNotClosedStateProps = {
  cycleStatus: string;
};

export function CfNotClosedState({ cycleStatus }: CfNotClosedStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 max-w-md mx-auto text-center">
      <h2 className="text-xl font-semibold text-gray-800">
        O ciclo CF ainda não foi encerrado
      </h2>
      <p className="text-sm text-gray-500">
        Status atual: <span className="font-medium text-gray-700">{cycleStatus}</span>
      </p>
    </div>
  );
}