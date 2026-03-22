'use client';

// Initial crawl page — start crawl + poll progress every 5s
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { initCrawl, getCrawlProgress, type CrawlProgress } from '@/lib/admin-api-client';

const POLL_INTERVAL = 5000;

export default function InitCrawlPage() {
  const { toast } = useToast();
  const [progress, setProgress] = useState<CrawlProgress | null>(null);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const p = await getCrawlProgress();
        setProgress(p);
        if (p.status === 'done' || p.status === 'error') {
          stopPolling();
          toast({
            title: p.status === 'done' ? 'Hoàn thành!' : 'Lỗi thu thập',
            description: p.message,
            variant: p.status === 'error' ? 'destructive' : 'default',
          });
        }
      } catch {
        stopPolling();
      }
    }, POLL_INTERVAL);
  }

  useEffect(() => () => stopPolling(), []);

  async function handleStart() {
    setStarting(true);
    try {
      await initCrawl();
      const p = await getCrawlProgress();
      setProgress(p);
      startPolling();
      toast({ title: 'Đã bắt đầu thu thập', description: 'Đang xử lý...' });
    } catch (err) {
      toast({
        title: 'Lỗi',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setStarting(false);
    }
  }

  const isRunning = progress?.status === 'running';
  const lawPct =
    progress && progress.laws_total > 0
      ? Math.round((progress.laws_crawled / progress.laws_total) * 100)
      : 0;
  const chunkPct =
    progress && progress.chunks_total > 0
      ? Math.round((progress.chunks_embedded / progress.chunks_total) * 100)
      : 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Thu thập ban đầu</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Thu thập toàn bộ văn bản luật từ nguồn và lập chỉ mục vào cơ sở dữ liệu.
        </p>
      </div>

      <Button onClick={handleStart} disabled={starting || isRunning}>
        {starting ? 'Đang khởi động...' : isRunning ? 'Đang thu thập...' : 'Bắt đầu thu thập'}
      </Button>

      {progress && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tiến trình</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProgressRow
              label="Văn bản luật"
              current={progress.laws_crawled}
              total={progress.laws_total}
              pct={lawPct}
            />
            <ProgressRow
              label="Đoạn văn nhúng"
              current={progress.chunks_embedded}
              total={progress.chunks_total}
              pct={chunkPct}
            />
            <p className="text-sm text-muted-foreground">{progress.message}</p>
            <StatusBadge status={progress.status} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ProgressRow({
  label,
  current,
  total,
  pct,
}: {
  label: string;
  current: number;
  total: number;
  pct: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {current}/{total} ({pct}%)
        </span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-purple-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: CrawlProgress['status'] }) {
  const map: Record<CrawlProgress['status'], { label: string; cls: string }> = {
    idle: { label: 'Chờ', cls: 'bg-white/10 text-muted-foreground' },
    running: { label: 'Đang chạy', cls: 'bg-blue-500/20 text-blue-400' },
    done: { label: 'Hoàn thành', cls: 'bg-green-500/20 text-green-400' },
    error: { label: 'Lỗi', cls: 'bg-red-500/20 text-red-400' },
  };
  const { label, cls } = map[status];
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>
      {label}
    </span>
  );
}
