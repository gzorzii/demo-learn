import { Card, CardContent, CardHeader } from './ui/card';
import { Skeleton } from './ui/skeleton';

export function CycleCardSkeleton() {
  return (
    <Card className="overflow-hidden shadow-sm">
      <Skeleton className="h-1 w-full rounded-none" />
      <CardHeader className="pb-2 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-4 w-28" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pb-5">
        <Skeleton className="h-4 w-40" />
        <div className="flex flex-col gap-1">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-3 w-8 self-end" />
        </div>
      </CardContent>
    </Card>
  );
}
