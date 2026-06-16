"use client";

import Navbar from "@/components/shop/Navbar";
import { Skeleton } from "@/components/ui/skeleton";

// Shown while auth/admin status is resolving on admin pages — mirrors the
// real sidebar + navbar + content layout so there's no layout jump once
// the actual page mounts.
export function AdminPageSkeleton() {
  return (
    <div className="min-h-screen flex w-full">
      <div className="hidden md:flex w-64 border-r border-border p-4 flex-col gap-2 shrink-0">
        <Skeleton className="h-8 w-32 mb-4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 rounded-lg" />
        ))}
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="container py-8 space-y-6">
          <Skeleton className="h-10 w-64 rounded" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </main>
      </div>
    </div>
  );
}
