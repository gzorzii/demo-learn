import { Card, CardContent, CardHeader } from './ui/card';
import { Skeleton } from './ui/skeleton';

export function TeamMemberCardSkeleton() {
  return (
    <Card className="overflow-hidden shadow-sm">
      <Skeleton className="h-1 w-full rounded-none" />
      <CardHeader className="pb-2 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-52" />
          </div>
          <Skeleton className="h-5 w-24" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pb-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-28" />
      </CardContent>
    </Card>
  );
}
