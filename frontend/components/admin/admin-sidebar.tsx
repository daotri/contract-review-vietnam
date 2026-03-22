'use client';

// Admin sidebar navigation with logout action
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, RefreshCw, Download, BookOpen, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminLogout } from '@/lib/admin-api-client';

const navItems = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard, exact: true },
  { href: '/admin/init', label: 'Thu thập ban đầu', icon: Download },
  { href: '/admin/crawl', label: 'Thu thập mới', icon: RefreshCw },
  { href: '/admin/laws', label: 'Quản lý luật', icon: BookOpen },
  { href: '/admin/ai-config', label: 'Cấu hình AI', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await adminLogout();
    router.push('/admin/login');
  }

  return (
    <aside className="w-56 min-h-screen bg-card text-foreground flex flex-col border-r border-border">
      <div className="px-5 py-5 border-b border-border">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Quản trị</p>
        <p className="text-sm font-bold mt-0.5">Contract AI</p>
      </div>

      <nav className="flex-1 py-4 space-y-0.5 px-2">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-purple-600/20 text-purple-400'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 pb-5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
