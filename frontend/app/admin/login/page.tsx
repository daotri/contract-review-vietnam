'use client';

// Admin login page — session cookie set by backend on success
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminLogin } from '@/lib/admin-api-client';

export default function AdminLoginPage() {
  const router = useRouter();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) {
      setError('Vui lòng nhập khóa quản trị');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await adminLogin(key);
      router.push('/admin');
    } catch (err) {
      setError((err as Error).message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm glass-card shadow-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-center text-gradient">Đăng nhập quản trị</CardTitle>
          <p className="text-sm text-center text-muted-foreground">Contract AI — Admin Panel</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-key">Khóa quản trị</Label>
              <Input
                id="admin-key"
                type="password"
                placeholder="Nhập khóa quản trị..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white hover:opacity-90" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
