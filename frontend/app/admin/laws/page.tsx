'use client';

// Laws management page — table with active toggle + search filter
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { listLaws, type LawItem } from '@/lib/admin-api-client';

export default function LawsPage() {
  const { toast } = useToast();
  const [laws, setLaws] = useState<LawItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  useEffect(() => {
    listLaws()
      .then(setLaws)
      .catch((err) =>
        toast({ title: 'Lỗi tải danh sách', description: (err as Error).message, variant: 'destructive' })
      )
      .finally(() => setLoading(false));
  }, [toast]);

  const filtered = laws.filter((l) => {
    const q = search.toLowerCase();
    return l.law_name.toLowerCase().includes(q) || l.law_number.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Quản lý văn bản luật</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bật/tắt các văn bản luật sử dụng trong quá trình kiểm tra hợp đồng.
        </p>
      </div>

      <Input
        placeholder="Tìm kiếm theo tên hoặc số hiệu..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Số hiệu</TableHead>
              <TableHead>Tên văn bản</TableHead>
              <TableHead className="text-center">Ưu tiên</TableHead>
              <TableHead className="text-center">Đã nhúng</TableHead>
              <TableHead className="text-center">Phiên bản</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Không tìm thấy văn bản luật nào
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((law) => (
                <TableRow key={law.id}>
                  <TableCell className="font-mono text-sm">{law.law_number}</TableCell>
                  <TableCell className="max-w-xs truncate" title={law.law_name}>
                    {law.law_name}
                  </TableCell>
                  <TableCell className="text-center">{law.priority}</TableCell>
                  <TableCell className="text-center">
                    {law.embedded ? (
                      <span className="text-green-400 font-medium text-xs">Có</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Chưa</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    v{law.version}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
