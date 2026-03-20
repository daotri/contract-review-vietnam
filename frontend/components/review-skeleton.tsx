'use client';
// Loading skeleton shown during upload/analysis state
import { Skeleton } from '@/components/ui/skeleton';

export function ReviewSkeleton() {
  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex gap-3">
        <Skeleton className="h-7 w-32 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>

      {/* Risk summary bar */}
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>

      {/* Clause cards */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
