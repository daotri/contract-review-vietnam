'use client';
// Individual risk level count card
import type { RiskLevel } from '@/lib/types';

const RISK_CONFIG: Record<RiskLevel, { label: string; bg: string; text: string; border: string }> = {
  critical: { label: 'Nghiêm trọng', bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/30' },
  high:     { label: 'Cao',          bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  medium:   { label: 'Trung bình',   bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  low:      { label: 'Thấp',         bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/30' },
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
