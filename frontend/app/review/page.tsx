'use client';
// Main page: state machine idle → uploading/analyzing → done | error
import { UploadForm } from '@/components/upload-form';
import { VerdictBanner } from '@/components/verdict-banner';
import { MissingClausesBanner } from '@/components/missing-clauses-banner';
import { ClauseList } from '@/components/clause-list';
import { ChatBox } from '@/components/chat-box';
import { ExportButton } from '@/components/export-button';
import { ReviewSkeleton } from '@/components/review-skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useReview } from '@/hooks/use-review';
import { RotateCcw, FileSearch } from 'lucide-react';

export default function Home() {
  const { state, result, error, submit, reset } = useReview();
  const isLoading = state === 'uploading' || state === 'analyzing';

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm">Kiểm Tra Hợp Đồng AI</span>
          </div>
          {state === 'done' && result && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={reset} className="gap-2">
                <RotateCcw className="w-3.5 h-3.5" />
                Tải lên mới
              </Button>
              <ExportButton review={result} />
            </div>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* IDLE — upload form */}
        {state === 'idle' && (
          <div className="space-y-6">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <h1 className="text-3xl font-bold tracking-tight text-gradient">Kiểm Tra Hợp Đồng</h1>
              <p className="text-muted-foreground leading-relaxed">
                Phân tích rủi ro và kiểm tra tuân thủ pháp luật Việt Nam bằng AI.
                Hỗ trợ hợp đồng lao động, dân sự, thương mại.
              </p>
            </div>
            <UploadForm onSubmit={submit} loading={false} />
          </div>
        )}

        {/* LOADING — skeleton */}
        {isLoading && (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-muted-foreground animate-pulse">
                {state === 'uploading' ? 'Đang tải file lên...' : 'AI đang phân tích hợp đồng...'}
              </p>
              <p className="text-xs text-muted-foreground">Quá trình này có thể mất 30–60 giây</p>
            </div>
            <ReviewSkeleton />
          </div>
        )}

        {/* ERROR */}
        {state === 'error' && (
          <div className="max-w-lg mx-auto text-center space-y-4 py-16">
            <p className="text-destructive font-medium">{error}</p>
            <Button variant="outline" onClick={reset} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Thử lại
            </Button>
          </div>
        )}

        {/* DONE — results */}
        {state === 'done' && result && (
          <div className="space-y-4">
            {/* Contract type badge */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm px-3 py-1 font-semibold">
                {result.contract_type || 'Hợp đồng'}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {result.risk_summary.total_clauses} điều khoản
              </Badge>
            </div>

            {/* Traffic light verdict */}
            <VerdictBanner review={result} />

            {/* Missing mandatory clauses warning */}
            <MissingClausesBanner review={result} />

            {/* Tabbed clause list */}
            <ClauseList clauses={result.clauses} />
          </div>
        )}
      </div>

      {/* Floating chat — only shown when results are ready */}
      {state === 'done' && result && <ChatBox review={result} />}
    </main>
  );
}
