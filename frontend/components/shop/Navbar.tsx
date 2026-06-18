"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/useCart";
import { Cloud, ShoppingBag, Search, ShoppingCart, Sparkles, UserCircle2 } from "lucide-react";

export default function Navbar() {
  const { user, isAdmin } = useAuth();
  const { count } = useCart();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/shop?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-background border-b border-border">
      <div className="container flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight">
          <div className="relative flex items-center justify-center">
            <Cloud className="text-primary h-9 w-14 md:h-11 md:w-20 fill-primary/15 stroke-[1.5]" />
            <span className="absolute text-[10px] md:text-xs font-extrabold text-primary uppercase tracking-tighter">CCC</span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-sm font-[Quicksand] font-bold tracking-wide text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary fill-primary/40" />
            Cotton Cloud Company
          </span>
        </Link>
        <form onSubmit={submit} className="hidden md:flex flex-1 max-w-sm relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cuties…" className="rounded-full pl-9" />
        </form>
        <nav className="flex items-center gap-2">
          <Link href="/shop"><Button variant="ghost" size="sm"><ShoppingBag className="mr-1 h-4 w-4" />Shop</Button></Link>
          <Link href="/cart">
            <Button variant="ghost" size="sm" className="relative">
              <ShoppingCart className="h-4 w-4" />
              {mounted && count > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-xs grid place-items-center">
                  {count}
                </span>
              )}
            </Button>
          </Link>
          {mounted && isAdmin && <Link href="/admin"><Button variant="secondary" size="sm">Admin</Button></Link>}
          {mounted && user ? (
            <Link href="/profile">
              <Button variant="ghost" size="sm" className="relative gap-1.5">
                <UserCircle2 className="h-5 w-5 text-primary" />
                <span className="hidden sm:inline text-sm max-w-[80px] truncate">
                  {user.name || user.email.split("@")[0]}
                </span>
              </Button>
            </Link>
          ) : (
            <Link href="/auth"><Button size="sm" className="bg-gradient-primary text-primary-foreground border-0">Sign in</Button></Link>
          )}
        </nav>
      </div>
      <form onSubmit={submit} className="md:hidden container pb-3 relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cuties…" className="rounded-full pl-9" />
      </form>
    </header>
  );
}
