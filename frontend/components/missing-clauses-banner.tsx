'use client';
// Warning banner for missing mandatory clauses — only renders when clauses are absent
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ContractReview } from '@/lib/types';

interface MissingClausesBannerProps {
  review: ContractReview;
}

export function MissingClausesBanner({ review }: MissingClausesBannerProps) {
  const { missing_mandatory_clauses } = review;
  if (missing_mandatory_clauses.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex gap-3 items-start">
      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="space-y-2 min-w-0">
        <p className="text-sm font-semibold text-amber-400">
          Thiếu {missing_mandatory_clauses.length} điều khoản bắt buộc
        </p>
        <div className="flex flex-wrap gap-1.5">
          {missing_mandatory_clauses.map((clause) => (
            <Badge
              key={clause}
              variant="outline"
              className="text-xs bg-amber-500/20 border-amber-500/30 text-amber-300 font-medium"
            >
              {clause}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
