'use client';
// Single clause card: auto-expanded for critical/high, compact layout with redline diff
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Paperclip } from 'lucide-react';
import type { ClauseAnalysis, RiskLevel } from '@/lib/types';

const RISK_CONFIG: Record<RiskLevel, { badge: string; border: string; dot: string; label: string }> = {
  critical: { badge: 'bg-red-500/10 text-red-400 border-red-500/30',       border: 'border-l-red-500',    dot: '🔴', label: 'Nghiêm trọng' },
  high:     { badge: 'bg-orange-500/10 text-orange-400 border-orange-500/30', border: 'border-l-orange-500', dot: '🟠', label: 'Cao' },
  medium:   { badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', border: 'border-l-yellow-500', dot: '🟡', label: 'Trung bình' },
  low:      { badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',     border: 'border-l-blue-500',   dot: '🔵', label: 'Thấp' },
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
        className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors text-left"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <span aria-hidden="true">{cfg.dot}</span>
          <span className="text-base font-semibold whitespace-nowrap">{title}</span>
          {issues[0] && (
            <span className="text-sm text-muted-foreground truncate hidden sm:block">
              — {issues[0]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`text-xs border ${cfg.badge} hidden sm:inline-flex`} variant="outline">
            {cfg.label}
          </Badge>
          {compliant && (
            <Badge variant="outline" className="text-xs border-green-500/30 bg-green-500/10 text-green-400 hidden sm:inline-flex">
              Ổn
            </Badge>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 pt-3 border-t space-y-4">
          {/* Issues list */}
          {issues.length > 0 && (
            <ul className="space-y-1">
              {issues.map((issue, i) => (
                <li key={i} className="text-base flex gap-2 leading-relaxed">
                  <span className="text-destructive mt-0.5 shrink-0">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Redline diff: clause_text → suggested_text */}
          {suggested_text && (
            <div className="rounded-md bg-green-500/10 border border-green-500/30 p-4 space-y-2 text-sm font-mono leading-relaxed">
              <p className="line-through text-red-400 whitespace-pre-wrap">{clause.clause_text}</p>
              <p className="text-green-400 whitespace-pre-wrap">{suggested_text}</p>
            </div>
          )}

          {/* Suggestion (prose) */}
          {suggestion && !suggested_text && (
            <p className="text-base text-muted-foreground leading-relaxed">{suggestion}</p>
          )}

          {/* Legal references inline */}
          {legal_references.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {legal_references.map((ref, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
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
