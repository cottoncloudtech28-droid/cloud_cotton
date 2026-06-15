import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/useCart";
import { Cloud, ShoppingBag, LogOut, Search, ShoppingCart, Sparkles } from "lucide-react";

export default function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const { count } = useCart();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    nav(`/shop?q=${encodeURIComponent(q.trim())}`);
  };
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-background/70 border-b border-border">
      <div className="container flex h-16 items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight">
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
          <Input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search cuties…" className="rounded-full pl-9" />
        </form>
        <nav className="flex items-center gap-2">
          <Link to="/shop"><Button variant="ghost" size="sm"><ShoppingBag className="mr-1 h-4 w-4" />Shop</Button></Link>
          <Link to="/cart">
            <Button variant="ghost" size="sm" className="relative">
              <ShoppingCart className="h-4 w-4" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-xs grid place-items-center">
                  {count}
                </span>
              )}
            </Button>
          </Link>
          {isAdmin && <Link to="/admin"><Button variant="secondary" size="sm">Admin</Button></Link>}
          {user ? (
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); nav("/"); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <Link to="/auth"><Button size="sm" className="bg-gradient-primary text-primary-foreground border-0">Sign in</Button></Link>
          )}
        </nav>
      </div>
      <form onSubmit={submit} className="md:hidden container pb-3 relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search cuties…" className="rounded-full pl-9" />
      </form>
    </header>
  );
}
