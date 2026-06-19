"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";
import ProductCard from "@/components/shop/ProductCard";
import SmartSearch from "@/components/shop/SmartSearch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getProducts, getCategories } from "@/lib/api";
import type { Product, Category } from "@/lib/types";

const SORT_OPTIONS = [
  { value: "newest",     label: "Newest first" },
  { value: "popular",    label: "Most popular" },
  { value: "price-asc",  label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

const PAGE_SIZE = 24;

function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const q        = searchParams.get("q") ?? "";
  const activeTag = searchParams.get("tag") ?? "";
  const sort     = searchParams.get("sort") ?? "newest";
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"));

  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    getProducts({
      q: q || undefined,
      tag: activeTag || undefined,
      sort,
      page,
      limit: PAGE_SIZE,
    })
      .then((data) => { setProducts(data.products ?? []); setTotal(data.total ?? 0); })
      .catch(() => { setProducts([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [searchParams]);

  const pushParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.delete("page");
    router.replace(`/shop?${params.toString()}`);
  };

  const allTags = Array.from(new Set(products.flatMap((p) => p.tags ?? []))).sort();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-8 space-y-8">

        {/* Header */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-bold">Shop everything cute</h1>
            <p className="text-muted-foreground mt-1">
              {loading ? "Loading…" : `${total} adorable item${total !== 1 ? "s" : ""} waiting for a new home`}
            </p>
          </div>

          {/* Sort */}
          <Select value={sort} onValueChange={(v) => pushParam("sort", v)}>
            <SelectTrigger className="w-48 rounded-full">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search */}
        <SmartSearch
          className="max-w-md"
          placeholder="Search cuties, tags, keywords…"
        />

        {/* Category links */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Browse by category</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/shop"
              className={`px-4 py-1.5 rounded-full text-sm border transition-colors font-medium ${
                !q && !activeTag
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
              onClick={() => pushParam("tag", null)}>
              #{activeTag} ✕
            </Badge>
          </div>
        )}

        {/* Tag chips */}
        {!activeTag && allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allTags.slice(0, 20).map((tag) => (
              <button key={tag} onClick={() => pushParam("tag", tag)}
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

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              disabled={page <= 1}
              onClick={() => pushParam("page", String(page - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | "…")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((item, i) =>
                item === "…" ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground">…</span>
                ) : (
                  <Button
                    key={item}
                    variant={item === page ? "default" : "outline"}
                    size="icon"
                    className={`rounded-full w-9 h-9 ${item === page ? "bg-gradient-primary text-primary-foreground border-0" : ""}`}
                    onClick={() => pushParam("page", String(item))}
                  >
                    {item}
                  </Button>
                )
              )}

            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              disabled={page >= totalPages}
              onClick={() => pushParam("page", String(page + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {!loading && total > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} products
          </p>
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
