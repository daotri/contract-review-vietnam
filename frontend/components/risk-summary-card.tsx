'use client';
// Individual risk level count card
import type { RiskLevel } from '@/lib/types';

const RISK_CONFIG: Record<RiskLevel, { label: string; bg: string; text: string; border: string }> = {
  critical: { label: 'Nghiêm trọng', bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
  high:     { label: 'Cao',         bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-200' },
  medium:   { label: 'Trung bình',  bg: 'bg-yellow-50',  text: 'text-yellow-700', border: 'border-yellow-200' },
  low:      { label: 'Thấp',        bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200' },
};

interface RiskSummaryCardProps {
  level: RiskLevel;
  count: number;
}

export function RiskSummaryCard({ level, count }: RiskSummaryCardProps) {
  const cfg = RISK_CONFIG[level];
  return (
    <div className={`rounded-lg border p-4 text-center ${cfg.bg} ${cfg.border}`}>
      <div className={`text-2xl font-bold ${cfg.text}`}>{count}</div>
      <div className={`text-xs font-medium mt-1 ${cfg.text}`}>{cfg.label}</div>
    </div>
  );
}
