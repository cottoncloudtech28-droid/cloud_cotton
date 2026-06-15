import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/shop/Navbar";
import ProductCard, { Product } from "@/components/shop/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const CATS = [
  "all",
  "stationery",
  "lunch-boxes",
  "bottles",
  "lamps",
  "return-gifts",
  "speakers",
  "toys",
  "quirky",
  "mixed",
];

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<Product[]>([]);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [cat, setCat] = useState(searchParams.get("cat") ?? "all");

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
    setCat(searchParams.get("cat") ?? "all");
  }, [searchParams]);

  useEffect(() => {
    supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false })
      .then(({ data }) => setItems(data ?? []));
  }, []);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (cat === "all") next.delete("cat");
    else next.set("cat", cat);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat]);

  const filtered = items.filter((p) =>
    (cat === "all" || p.category === cat) &&
    p.name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-8 space-y-6">
        <div>
          <h1 className="text-4xl font-bold">Shop everything cute</h1>
          <p className="text-muted-foreground mt-2">{items.length} adorable item{items.length !== 1 && "s"} waiting for a new home</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input placeholder="Search for cuties…" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-full" />
          <div className="flex gap-2 overflow-x-auto">
            {CATS.map((c) => (
              <Button key={c} size="sm" variant={cat === c ? "default" : "outline"}
                onClick={() => setCat(c)}
                className={`rounded-full capitalize ${cat === c ? "bg-gradient-primary text-primary-foreground border-0" : ""}`}>
                {c.replace("-", " ")}
              </Button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-20 rounded-3xl bg-card shadow-soft">
            <div className="text-6xl mb-3">🌷</div>
            <p className="text-muted-foreground">Nothing here yet — check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </main>
    </div>
  );
}
