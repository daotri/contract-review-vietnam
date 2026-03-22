// Admin layout — wraps all /admin/* pages with sidebar navigation
// Login page renders its own full-screen layout, so we pass children through as-is
'use client';

import { usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { Toaster } from '@/components/ui/toaster';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Login page has its own full-screen layout — skip sidebar
  if (pathname === '/admin/login') {
    return <>{children}<Toaster /></>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
