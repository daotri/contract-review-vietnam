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
    <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 flex gap-3 items-start">
      <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="space-y-2 min-w-0">
        <p className="text-sm font-semibold text-orange-800">
          Thiếu {missing_mandatory_clauses.length} điều khoản bắt buộc
        </p>
        <div className="flex flex-wrap gap-1.5">
          {missing_mandatory_clauses.map((clause) => (
            <Badge
              key={clause}
              variant="outline"
              className="text-xs bg-white border-orange-300 text-orange-700 font-medium"
            >
              {clause}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
