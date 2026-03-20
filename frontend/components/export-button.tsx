'use client';
// Export stub — downloads report as JSON for now; PDF/Word via future libs
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { ContractReview } from '@/lib/types';

interface ExportButtonProps {
  review: ContractReview;
}

export function ExportButton({ review }: ExportButtonProps) {
  function handleExport() {
    // Stub: export as formatted JSON — replace with html2pdf/docx in next phase
    const content = JSON.stringify(review, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ket-qua-kiem-tra-hop-dong.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
      <Download className="w-4 h-4" />
      Xuất báo cáo
    </Button>
  );
}
