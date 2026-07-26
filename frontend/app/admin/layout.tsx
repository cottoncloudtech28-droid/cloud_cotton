"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";
import { Card } from "@/components/ui/card";

// Shared admin layout — provides the sidebar, top header and auth guard for
// every page under /admin. Individual pages no longer need to wrap themselves
// with SidebarProvider / AdminSidebar / AdminHeader.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.push(`/auth?redirect=${encodeURIComponent("/admin")}`);
  }, [user, loading, router]);

  // Auth is still resolving
  if (loading) return <AdminPageSkeleton />;

  // Signed in but not an admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Card className="p-8 text-center max-w-lg mx-auto">
          <h1 className="text-2xl font-bold mb-2">Admin access required 🔐</h1>
          <p className="text-muted-foreground mb-4">
            Your account ({user?.email}) is signed in but does not have admin privileges.
          </p>
          {user?.id && (
            <p className="text-xs text-muted-foreground break-all">User ID: {user.id}</p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader />
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
