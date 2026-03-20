'use client';
// Single clause card: auto-expanded for critical/high, compact layout with redline diff
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Paperclip } from 'lucide-react';
import type { ClauseAnalysis, RiskLevel } from '@/lib/types';

const RISK_CONFIG: Record<RiskLevel, { badge: string; border: string; dot: string; label: string }> = {
  critical: { badge: 'bg-red-100 text-red-700 border-red-200',    border: 'border-l-red-500',    dot: '🔴', label: 'Nghiêm trọng' },
  high:     { badge: 'bg-orange-100 text-orange-700 border-orange-200', border: 'border-l-orange-500', dot: '🟠', label: 'Cao' },
  medium:   { badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', border: 'border-l-yellow-500', dot: '🟡', label: 'Trung bình' },
  low:      { badge: 'bg-blue-100 text-blue-700 border-blue-200',   border: 'border-l-blue-500',   dot: '🔵', label: 'Thấp' },
};

interface ClauseCardProps {
  clause: ClauseAnalysis;
}

export function ClauseCard({ clause }: ClauseCardProps) {
  const { clause_index, risk_level, issues, legal_references, suggestion, suggested_text, compliant } = clause;
  const cfg = RISK_CONFIG[risk_level];
  // Auto-expand critical and high risk clauses
  const [expanded, setExpanded] = useState(risk_level === 'critical' || risk_level === 'high');

  // Derive a short title from first issue or fallback
  const title = `Điều ${clause_index + 1}`;

  return (
    <div className={`rounded-lg border border-l-4 ${cfg.border} bg-background overflow-hidden`}>
      {/* Header row */}
      <button
        className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors text-left"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <span aria-hidden="true">{cfg.dot}</span>
          <span className="text-sm font-semibold whitespace-nowrap">{title}</span>
          {issues[0] && (
            <span className="text-xs text-muted-foreground truncate hidden sm:block">
              — {issues[0]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`text-xs border ${cfg.badge} hidden sm:inline-flex`} variant="outline">
            {cfg.label}
          </Badge>
          {compliant && (
            <Badge variant="outline" className="text-xs border-green-200 bg-green-50 text-green-700 hidden sm:inline-flex">
              Ổn
            </Badge>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t space-y-3">
          {/* Issues list */}
          {issues.length > 0 && (
            <ul className="space-y-1">
              {issues.map((issue, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-destructive mt-0.5 shrink-0">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Redline diff: clause_text → suggested_text */}
          {suggested_text && (
            <div className="rounded-md bg-muted/50 p-3 space-y-1 text-xs font-mono leading-relaxed">
              <p className="line-through text-red-600 whitespace-pre-wrap">{clause.clause_text}</p>
              <p className="text-green-700 whitespace-pre-wrap">{suggested_text}</p>
            </div>
          )}

          {/* Suggestion (prose) */}
          {suggestion && !suggested_text && (
            <p className="text-sm text-muted-foreground">{suggestion}</p>
          )}

          {/* Legal references inline */}
          {legal_references.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {legal_references.map((ref, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Paperclip className="w-3 h-3" aria-hidden="true" />
                  {ref}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
