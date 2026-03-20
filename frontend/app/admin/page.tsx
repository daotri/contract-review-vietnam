'use client';

// Admin dashboard — system stats + quick action buttons
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Database, Cpu, Clock } from 'lucide-react';
import { getAdminStats, type AdminStats } from '@/lib/admin-api-client';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch((err) => setError((err as Error).message));
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Tổng quan hệ thống</h1>
        <p className="text-sm text-muted-foreground mt-1">Trạng thái hệ thống Contract AI</p>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-md">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<BookOpen className="h-5 w-5 text-blue-500" />}
          label="Tổng số luật"
          value={stats?.total_laws}
        />
        <StatCard
          icon={<Database className="h-5 w-5 text-green-500" />}
          label="Đã nhúng"
          value={stats?.embedded_laws}
        />
        <StatCard
          icon={<Cpu className="h-5 w-5 text-purple-500" />}
          label="Tổng đoạn văn"
          value={stats?.total_chunks}
        />
        <StatCard
          icon={<Cpu className="h-5 w-5 text-orange-500" />}
          label="Mô hình AI"
          value={stats?.current_model}
          small
        />
      </div>

      {stats?.last_crawl_at && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Thu thập lần cuối: {new Date(stats.last_crawl_at).toLocaleString('vi-VN')}</span>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button asChild>
          <Link href="/admin/init">Thu thập ban đầu</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/crawl">Thêm luật mới</Link>
        </Button>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  small,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number | string;
  small?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {value === undefined ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <p className={small ? 'text-sm font-semibold truncate' : 'text-2xl font-bold'}>
            {typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
