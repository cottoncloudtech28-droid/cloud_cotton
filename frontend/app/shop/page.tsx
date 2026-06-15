"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";
import ProductCard from "@/components/shop/ProductCard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { getProducts, getCategories } from "@/lib/api";
import type { Product, Category } from "@/lib/types";

function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [activeTag, setActiveTag] = useState(searchParams.get("tag") ?? "");

  // Fetch categories once
  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  // Fetch products whenever search params change
  useEffect(() => {
    const qParam = searchParams.get("q") ?? "";
    const tagParam = searchParams.get("tag") ?? "";
    setQ(qParam);
    setActiveTag(tagParam);

    setLoading(true);
    getProducts({ q: qParam || undefined, tag: tagParam || undefined })
      .then((data) => setProducts(data ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [searchParams]);

  const handleSearch = (val: string) => {
    setQ(val);
    const params = new URLSearchParams(searchParams.toString());
    if (val.trim()) params.set("q", val);
    else params.delete("q");
    router.replace(`/shop?${params.toString()}`);
  };

  const handleTag = (tag: string) => {
    const next = activeTag === tag ? "" : tag;
    setActiveTag(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("tag", next);
    else params.delete("tag");
    router.replace(`/shop?${params.toString()}`);
  };

  // Collect all tags for filter chips
  const allTags = Array.from(
    new Set(products.flatMap((p) => p.tags ?? []))
  ).sort();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-8 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold">Shop everything cute</h1>
          <p className="text-muted-foreground mt-1">
            {loading ? "Loading…" : `${products.length} adorable item${products.length !== 1 ? "s" : ""} waiting for a new home`}
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search cuties, tags, keywords…"
            className="pl-9 rounded-full" />
        </div>

        {/* Category links */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Browse by category</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/shop"
              className={`px-4 py-1.5 rounded-full text-sm border transition-colors font-medium ${
                !searchParams.get("q") && !searchParams.get("tag")
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:border-primary hover:bg-muted"
              }`}>
              All
            </Link>
            {categories.map((c) => (
              <Link key={c.slug} href={`/shop/${c.slug}`}
                className="px-4 py-1.5 rounded-full text-sm border border-border hover:border-primary hover:bg-muted transition-colors font-medium">
                {c.emoji} {c.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Active tag filter */}
        {activeTag && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filtered by tag:</span>
            <Badge variant="secondary" className="px-3 py-1 text-sm cursor-pointer"
              onClick={() => handleTag(activeTag)}>
              #{activeTag} ✕
            </Badge>
          </div>
        )}

        {/* Tag chips from results */}
        {!activeTag && allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allTags.slice(0, 20).map((tag) => (
              <button key={tag} onClick={() => handleTag(tag)}
                className="px-3 py-1 rounded-full text-xs border border-border hover:border-primary hover:bg-muted transition-colors">
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 rounded-2xl bg-muted border border-border">
            <div className="text-6xl mb-3">🌷</div>
            <p className="font-medium">Nothing found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try different keywords or <Link href="/shop" className="text-primary hover:underline">browse all</Link>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense>
      <ShopContent />
    </Suspense>
  );
}
