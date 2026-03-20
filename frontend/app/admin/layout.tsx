// Admin layout — wraps all /admin/* pages with sidebar navigation
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { Toaster } from '@/components/ui/toaster';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-neutral-50">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
