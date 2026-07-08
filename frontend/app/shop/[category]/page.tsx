"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";
import ProductCard from "@/components/shop/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronRight, Search, PackageOpen } from "lucide-react";
import { getCategory, getProducts, getProductFacets } from "@/lib/api";
import type { Category, Product } from "@/lib/types";
import ProductFilters, { type FilterValues, type ProductFacets } from "@/components/shop/ProductFilters";

const LIMIT = 96;

function CategoryContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.category as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [facets, setFacets] = useState<ProductFacets>({ priceMin: 0, priceMax: 0, colors: [], sizes: [] });

  const q         = searchParams.get("q") ?? "";
  const activeTag = searchParams.get("tag") ?? "";
  const minPrice  = searchParams.get("minPrice");
  const maxPrice  = searchParams.get("maxPrice");
  const colorParam = searchParams.get("color") ?? "";
  const sizeParam   = searchParams.get("size") ?? "";
  const inStock     = searchParams.get("inStock") === "true";

  const filterValue: FilterValues = {
    minPrice: minPrice ? Number(minPrice) : null,
    maxPrice: maxPrice ? Number(maxPrice) : null,
    colors: colorParam ? colorParam.split(",") : [],
    sizes: sizeParam ? sizeParam.split(",") : [],
    inStock,
  };

  const [qInput, setQInput] = useState(q);
  useEffect(() => setQInput(q), [q]);

  // Category + facets reload whenever the category slug changes
  useEffect(() => {
    setNotFound(false);
    getCategory(slug).then(setCategory).catch(() => setNotFound(true));
  }, [slug]);

  useEffect(() => {
    getProductFacets({ cat: slug, q: q || undefined }).then(setFacets).catch(() => {});
  }, [slug, q]);

  useEffect(() => {
    setLoading(true);
    getProducts({
      cat: slug,
      q: q || undefined,
      tag: activeTag || undefined,
      limit: LIMIT,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      color: colorParam || undefined,
      size: sizeParam || undefined,
      inStock: inStock || undefined,
    })
      .then((data) => {
        const prods = data.products ?? [];
        setProducts(prods);
        setTotal(data.total ?? 0);
        const tagSet = new Set<string>();
        prods.forEach((p) => (p.tags ?? []).forEach((t) => tagSet.add(t)));
        setAllTags(Array.from(tagSet).sort());
      })
      .catch(() => { setProducts([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [slug, searchParams]);

  // Debounce the search box into the URL so it hits the backend, not a client-side filter
  useEffect(() => {
    const t = setTimeout(() => {
      if (qInput !== q) pushParam("q", qInput || null);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput]);

  useEffect(() => {
    if (notFound) router.push("/shop");
  }, [notFound, router]);

  const pushParam = (key: string, value: string | null) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    router.replace(`/shop/${slug}?${p.toString()}`);
  };

  const applyFilters = (v: FilterValues) => {
    const p = new URLSearchParams(searchParams.toString());
    if (v.minPrice != null) p.set("minPrice", String(v.minPrice)); else p.delete("minPrice");
    if (v.maxPrice != null) p.set("maxPrice", String(v.maxPrice)); else p.delete("maxPrice");
    if (v.colors.length) p.set("color", v.colors.join(",")); else p.delete("color");
    if (v.sizes.length) p.set("size", v.sizes.join(",")); else p.delete("size");
    if (v.inStock) p.set("inStock", "true"); else p.delete("inStock");
    router.replace(`/shop/${slug}?${p.toString()}`);
  };

  const hasActiveFilters =
    !!q || !!activeTag || filterValue.colors.length > 0 || filterValue.sizes.length > 0 ||
    filterValue.inStock || filterValue.minPrice != null || filterValue.maxPrice != null;

  // ── Skeletons ──────────────────────────────────────────────────────────────
  if (loading && !category) {
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
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold">{category.name}</h1>
              {category.description && (
                <p className="mt-2 text-base text-white/90 max-w-lg">{category.description}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-muted py-12 border-b border-border">
            <div className="container text-center space-y-2">
              <span className="text-5xl">{category.emoji}</span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mt-2">{category.name}</h1>
              {category.description && (
                <p className="text-muted-foreground text-base max-w-lg mx-auto mt-1">
                  {category.description}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="container py-6 sm:py-8 space-y-5 sm:space-y-6">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
            <Link href="/shop" className="hover:text-foreground transition-colors">Shop</Link>
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-foreground font-medium">{category.name}</span>
          </nav>

          {/* Search + filters */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={qInput} onChange={(e) => setQInput(e.target.value)}
                  placeholder={`Search in ${category.name}…`}
                  className="pl-9 rounded-full" />
              </div>
              <ProductFilters facets={facets} value={filterValue} onApply={applyFilters} />
            </div>

            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => pushParam("tag", null)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    !activeTag ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary hover:bg-muted"
                  }`}>
                  All
                </button>
                {allTags.map((tag) => (
                  <button key={tag} onClick={() => pushParam("tag", activeTag === tag ? null : tag)}
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
            {loading ? "Loading…" : `${total} product${total !== 1 ? "s" : ""}`}
            {activeTag && <span> tagged <Badge variant="secondary" className="ml-1">#{activeTag}</Badge></span>}
          </p>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 rounded-2xl bg-muted border border-border">
              <PackageOpen className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-medium">No products found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {hasActiveFilters ? "Try clearing your filters" : "Nothing here yet — check back soon!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {products.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function CategoryPage() {
  return (
    <Suspense>
      <CategoryContent />
    </Suspense>
  );
}
