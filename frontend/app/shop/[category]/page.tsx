"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";
import ProductCard from "@/components/shop/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronRight, Search, PackageOpen } from "lucide-react";
import { getCategory, getProducts } from "@/lib/api";
import type { Category, Product } from "@/lib/types";

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.category as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    setQ("");
    setActiveTag("");

    Promise.allSettled([
      getCategory(slug),
      getProducts({ cat: slug, limit: 96 }),
    ]).then(([catRes, prodRes]) => {
      if (catRes.status === "rejected") { router.push("/shop"); return; }
      setCategory(catRes.value);

      if (prodRes.status === "fulfilled") {
        const prods = prodRes.value.products ?? [];
        setProducts(prods);
        setFiltered(prods);

        const tagSet = new Set<string>();
        prods.forEach((p) => (p.tags ?? []).forEach((t) => tagSet.add(t)));
        setAllTags(Array.from(tagSet).sort());
      }
    }).finally(() => setLoading(false));
  }, [slug]);

  // Filter on q / activeTag
  useEffect(() => {
    let list = products;
    if (activeTag) list = list.filter((p) => p.tags?.includes(activeTag));
    if (q.trim()) {
      const qlo = q.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(qlo) ||
          (p.short_description ?? "").toLowerCase().includes(qlo) ||
          (p.tags ?? []).some((t) => t.toLowerCase().includes(qlo))
      );
    }
    setFiltered(list);
  }, [q, activeTag, products]);

  // ── Skeletons ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main>
          <Skeleton className="h-48 w-full rounded-none" />
          <div className="container py-8 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!category) return null;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>

        {/* ── Banner ─────────────────────────────────────────────────────── */}
        {category.banner_url ? (
          <div className="relative h-72 md:h-96 overflow-hidden">
            <img src={category.banner_url} alt={category.name}
              className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white text-center px-4">
              <span className="text-5xl mb-2">{category.emoji}</span>
              <h1 className="text-4xl md:text-5xl font-extrabold">{category.name}</h1>
              {category.description && (
                <p className="mt-2 text-base text-white/90 max-w-lg">{category.description}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-muted py-12 border-b border-border">
            <div className="container text-center space-y-2">
              <span className="text-5xl">{category.emoji}</span>
              <h1 className="text-4xl md:text-5xl font-extrabold mt-2">{category.name}</h1>
              {category.description && (
                <p className="text-muted-foreground text-base max-w-lg mx-auto mt-1">
                  {category.description}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="container py-8 space-y-6">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
            <Link href="/shop" className="hover:text-foreground transition-colors">Shop</Link>
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-foreground font-medium">{category.name}</span>
          </nav>

          {/* Search + tag filters */}
          <div className="space-y-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)}
                placeholder={`Search in ${category.name}…`}
                className="pl-9 rounded-full" />
            </div>

            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setActiveTag("")}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    !activeTag ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary hover:bg-muted"
                  }`}>
                  All
                </button>
                {allTags.map((tag) => (
                  <button key={tag} onClick={() => setActiveTag(activeTag === tag ? "" : tag)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      activeTag === tag ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary hover:bg-muted"
                    }`}>
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product count */}
          <p className="text-sm text-muted-foreground">
            {filtered.length} product{filtered.length !== 1 ? "s" : ""}
            {activeTag && <span> tagged <Badge variant="secondary" className="ml-1">#{activeTag}</Badge></span>}
          </p>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-20 rounded-2xl bg-muted border border-border">
              <PackageOpen className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-medium">No products found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {q || activeTag ? "Try clearing your filters" : "Nothing here yet — check back soon!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filtered.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
