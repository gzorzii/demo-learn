import { Skeleton } from './ui/skeleton';

export function EvaluationFormSkeleton() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-5 w-48" />
      </div>
      <Skeleton className="h-4 w-56" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-9 w-36" />
    </div>
  );
}
