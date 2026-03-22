'use client';

// Crawl page — URL input → diff preview → selective confirm
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { DiffPreview } from '@/components/admin/diff-preview';
import {
  crawlUrl,
  confirmCrawl,
  type CrawlDiffResponse,
} from '@/lib/admin-api-client';

export default function CrawlPage() {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [diff, setDiff] = useState<CrawlDiffResponse | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  async function handleCrawl(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setCrawling(true);
    setDiff(null);
    setSelected([]);
    try {
      const result = await crawlUrl(url.trim());
      setDiff(result);
      setSelected(result.changes.map((a) => a.article_id));
    } catch (err) {
      toast({ title: 'Lỗi thu thập', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setCrawling(false);
    }
  }

  async function handleConfirm() {
    if (!diff || selected.length === 0) return;
    setConfirming(true);
    try {
      await confirmCrawl(url.trim(), selected);
      toast({ title: 'Áp dụng thành công', description: `Đã cập nhật ${selected.length} điều khoản.` });
      setDiff(null);
      setUrl('');
      setSelected([]);
    } catch (err) {
      toast({ title: 'Lỗi xác nhận', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setConfirming(false);
    }
  }

  function toggleArticle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Thu thập luật mới</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Nhập URL văn bản luật để xem trước thay đổi trước khi áp dụng.
        </p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleCrawl} className="flex gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="crawl-url">URL văn bản luật</Label>
              <Input
                id="crawl-url"
                type="url"
                placeholder="https://thuvienphapluat.vn/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={crawling}
              />
            </div>
            <div className="self-end">
              <Button type="submit" disabled={crawling || !url.trim()}>
                {crawling ? 'Đang thu thập...' : 'Thu thập'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {diff && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Xem trước thay đổi — {diff.law_name} ({diff.law_number})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DiffPreview
              changes={diff.changes}
              selected={selected}
              onToggle={toggleArticle}
              onSelectAll={() => setSelected(diff.changes.map((a) => a.article_id))}
              onClearAll={() => setSelected([])}
            />
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleConfirm}
                disabled={confirming || selected.length === 0}
              >
                {confirming ? 'Đang áp dụng...' : `Xác nhận (${selected.length} điều khoản)`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
