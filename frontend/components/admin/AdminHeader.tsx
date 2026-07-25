"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cloud, ExternalLink, LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ADMIN_NAV } from "./AdminSidebar";

// Dedicated top bar for the admin panel — shared across every admin page so the
// header stays consistent. Title + icon are derived from the current route using
// the same nav list as the sidebar, so a page only needs <AdminHeader /> (pass
// children for page-specific action buttons on the right).
export function AdminHeader({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useAuth();

  // Longest matching url wins so nested routes resolve to their section; "/admin"
  // (Products) only matches exactly, never as a prefix of the others.
  const active = [...ADMIN_NAV]
    .sort((a, b) => b.url.length - a.url.length)
    .find((i) => pathname === i.url || (i.url !== "/admin" && pathname.startsWith(i.url + "/")));

  const Icon = active?.icon;
  const title = active?.title ?? "Admin";

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 sm:gap-3 h-14 px-3 sm:px-6 bg-card border-b border-border">
      <SidebarTrigger className="shrink-0" />

      {/* Brand */}
      <Link href="/admin" className="flex items-center gap-2 shrink-0 group">
        <span className="h-7 w-7 rounded-lg bg-gradient-primary grid place-items-center text-primary-foreground shadow-sm">
          <Cloud className="h-4 w-4" />
        </span>
        <span className="font-bold hidden sm:inline group-hover:text-primary transition-colors">Cotton Cloud</span>
        <span className="text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
          Admin
        </span>
      </Link>

      {/* Current page breadcrumb */}
      <span className="text-muted-foreground/40 hidden sm:inline">/</span>
      <div className="flex items-center gap-1.5 min-w-0">
        {Icon && <Icon className="h-4 w-4 text-primary shrink-0" />}
        <h1 className="text-sm sm:text-base font-bold truncate">{title}</h1>
      </div>

      {/* Right side: page actions + store link + sign out */}
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
        {children}
        <Link href="/" target="_blank" rel="noopener noreferrer" className="hidden sm:inline-flex">
          <Button variant="outline" size="sm" className="rounded-full gap-1.5 h-8">
            <ExternalLink className="h-3.5 w-3.5" /> View store
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          title="Sign out"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
