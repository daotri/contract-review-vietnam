'use client';
// Clause list with 3 tabs: urgent fixes (critical+high), notes (medium), ok (low+compliant)
import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ClauseCard } from './clause-card';
import type { ClauseAnalysis } from '@/lib/types';

interface ClauseListProps {
  clauses: ClauseAnalysis[];
}

type TabKey = 'urgent' | 'notes' | 'ok';

function sortCriticalFirst(list: ClauseAnalysis[]): ClauseAnalysis[] {
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  return [...list].sort((a, b) => order[a.risk_level] - order[b.risk_level]);
}

export function ClauseList({ clauses }: ClauseListProps) {
  const [tab, setTab] = useState<TabKey>('urgent');

  const { urgent, notes, ok } = useMemo(() => ({
    urgent: sortCriticalFirst(clauses.filter(c => c.risk_level === 'critical' || c.risk_level === 'high')),
    notes:  clauses.filter(c => c.risk_level === 'medium'),
    ok:     clauses.filter(c => c.risk_level === 'low' || c.compliant),
  }), [clauses]);

  function emptyMsg(label: string) {
    return <p className="text-sm text-muted-foreground text-center py-8">Không có điều khoản {label}.</p>;
  }

  return (
    <Tabs value={tab} onValueChange={v => setTab(v as TabKey)}>
      <TabsList className="w-full grid grid-cols-3">
        <TabsTrigger value="urgent" className="text-xs sm:text-sm">
          Cần sửa ngay ({urgent.length})
        </TabsTrigger>
        <TabsTrigger value="notes" className="text-xs sm:text-sm">
          Lưu ý ({notes.length})
        </TabsTrigger>
        <TabsTrigger value="ok" className="text-xs sm:text-sm">
          Ổn ({ok.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="urgent" className="mt-3 space-y-2">
        {urgent.length === 0 ? emptyMsg('cần sửa') : urgent.map((c, i) => (
          <ClauseCard key={c.clause_index ?? i} clause={c} />
        ))}
      </TabsContent>

      <TabsContent value="notes" className="mt-3 space-y-2">
        {notes.length === 0 ? emptyMsg('cần lưu ý') : notes.map((c, i) => (
          <ClauseCard key={c.clause_index ?? i} clause={c} />
        ))}
      </TabsContent>

      <TabsContent value="ok" className="mt-3 space-y-2">
        {ok.length === 0 ? emptyMsg('ổn định') : ok.map((c, i) => (
          <ClauseCard key={c.clause_index ?? i} clause={c} />
        ))}
      </TabsContent>
    </Tabs>
  );
}
