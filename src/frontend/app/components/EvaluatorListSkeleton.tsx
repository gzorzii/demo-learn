export function EvaluatorListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-gray-200 bg-[#F8F9FA] p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-4 w-40 rounded bg-gray-200" />
              <div className="h-3 w-56 rounded bg-gray-200" />
              <div className="h-3 w-32 rounded bg-gray-200" />
            </div>
            <div className="h-7 w-20 rounded-lg bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
