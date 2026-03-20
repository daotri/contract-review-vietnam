'use client';
// Traffic light verdict banner: score, risk counts, overall assessment
import type { ContractReview } from '@/lib/types';

interface VerdictBannerProps {
  review: ContractReview;
}

function calcScore(review: ContractReview): number {
  const { critical, high, medium, low } = review.risk_summary;
  const missing = review.missing_mandatory_clauses.length;
  const raw = 100 - (critical * 25 + high * 15 + medium * 5 + low * 1) - missing * 10;
  return Math.max(0, Math.min(100, raw));
}

type VerdictConfig = {
  icon: string;
  label: string;
  subLabel: string;
  bg: string;
  text: string;
  barColor: string;
  border: string;
};

function getVerdict(score: number): VerdictConfig {
  if (score >= 70) {
    return {
      icon: '🟢',
      label: 'CÓ THỂ KÝ',
      subLabel: 'Hợp đồng đạt yêu cầu cơ bản',
      bg: 'bg-green-50',
      text: 'text-green-800',
      barColor: 'bg-green-500',
      border: 'border-green-200',
    };
  }
  if (score >= 40) {
    return {
      icon: '🟡',
      label: 'CẦN XEM XÉT',
      subLabel: 'Cần chỉnh sửa trước khi ký',
      bg: 'bg-yellow-50',
      text: 'text-yellow-800',
      barColor: 'bg-yellow-500',
      border: 'border-yellow-200',
    };
  }
  return {
    icon: '🔴',
    label: 'KHÔNG NÊN KÝ',
    subLabel: 'Cần chỉnh sửa nhiều vấn đề nghiêm trọng',
    bg: 'bg-red-50',
    text: 'text-red-800',
    barColor: 'bg-red-500',
    border: 'border-red-200',
  };
}

export function VerdictBanner({ review }: VerdictBannerProps) {
  const score = calcScore(review);
  const verdict = getVerdict(score);
  const { critical, high, medium, low } = review.risk_summary;

  return (
    <div className={`rounded-xl border p-5 space-y-3 ${verdict.bg} ${verdict.border}`}>
      {/* Verdict heading */}
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden="true">{verdict.icon}</span>
        <div>
          <p className={`text-lg font-bold leading-tight ${verdict.text}`}>{verdict.label}</p>
          <p className={`text-sm font-medium ${verdict.text} opacity-80`}>{verdict.subLabel}</p>
        </div>
      </div>

      {/* Overall assessment */}
      {review.overall_assessment && (
        <p className={`text-sm leading-relaxed ${verdict.text} opacity-90`}>
          {review.overall_assessment}
        </p>
      )}

      {/* Score bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className={`text-xs font-medium ${verdict.text} opacity-70`}>Điểm rủi ro</span>
          <span className={`text-sm font-bold ${verdict.text}`}>{score}/100 điểm</span>
        </div>
        <div className="w-full bg-white/60 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${verdict.barColor}`}
            style={{ width: `${score}%` }}
            role="progressbar"
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Risk counts inline */}
      <div className={`flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium ${verdict.text} opacity-80`}>
        {critical > 0 && <span>{critical} nghiêm trọng</span>}
        {high > 0 && <span>{high} cao</span>}
        {medium > 0 && <span>{medium} trung bình</span>}
        {low > 0 && <span>{low} thấp</span>}
      </div>
    </div>
  );
}
