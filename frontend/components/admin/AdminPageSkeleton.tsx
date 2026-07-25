"use client";

import { Skeleton } from "@/components/ui/skeleton";

// Shown while auth/admin status is resolving on admin pages — mirrors the
// real sidebar + admin header + content layout so there's no layout jump once
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
        <div className="h-14 px-6 flex items-center gap-3 border-b border-border bg-card">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-5 w-40 rounded" />
          <Skeleton className="ml-auto h-8 w-28 rounded-full" />
        </div>
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
