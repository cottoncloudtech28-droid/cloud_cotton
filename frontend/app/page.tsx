"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/components/shop/Navbar";
import ProductCard from "@/components/shop/ProductCard";
import type { Product } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { Sparkles } from "lucide-react";
import Footer from "@/components/shop/Footer";

const CATEGORIES = [
  { slug: "stationery",    name: "Stationery",    emoji: "🌸", bg: "#fff0f5" },
  { slug: "lunch-boxes",   name: "Lunch Boxes",   emoji: "🍡", bg: "#fff8e1" },
  { slug: "bottles",       name: "Bottles",       emoji: "🫧", bg: "#e3f2fd" },
  { slug: "lamps",         name: "Lamps",         emoji: "🌙", bg: "#fffde7" },
  { slug: "return-gifts",  name: "Return Gifts",  emoji: "🎀", bg: "#fce4ec" },
  { slug: "speakers",      name: "Speakers",      emoji: "🎧", bg: "#f3e5f5" },
  { slug: "toys",          name: "Toys",          emoji: "🐻", bg: "#e8f5e9" },
  { slug: "quirky",        name: "Quirky Items",  emoji: "🦄", bg: "#e0f7fa" },
  { slug: "mixed",         name: "Mixed Items",   emoji: "🍭", bg: "#fbe9e7" },
];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroImgOk, setHeroImgOk] = useState(true);

  useEffect(() => {
    apiFetch("/api/products?limit=8&sort=newest")
      .then((data) => setProducts((data?.products || data || []).slice(0, 8)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">

      {/* ── ANNOUNCEMENT BAR ── */}
      <div className="bg-gradient-primary text-primary-foreground text-center text-xs py-2 font-semibold tracking-wide">
        ✨ Free shipping on orders over ₹1,499 &nbsp;·&nbsp; New arrivals every week 🌸
      </div>

      <Navbar />

      <main>

        {/* ── HERO ── */}
        <section className="relative overflow-hidden">

          {/* Mobile hero: gradient card, no image dependency */}
          <div className="md:hidden bg-gradient-to-br from-pink-50 via-purple-50 to-amber-50 px-6 pt-8 pb-0">
            <div className="space-y-3 mb-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3 w-3 fill-primary/40" /> New collection just dropped
              </span>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight uppercase bg-gradient-primary bg-clip-text text-transparent">
                Cotton Cloud<br />Company
              </h1>
              <p className="text-sm text-foreground/70 font-[Fredoka]">
                Your happy place for all things cute &amp; quirky 🌸
              </p>
              <div className="flex gap-3 pt-1">
                <Link href="/shop">
                  <button className="px-6 py-2.5 rounded-full bg-gradient-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity">
                    Shop Now
                  </button>
                </Link>
                <Link href="#new-arrivals">
                  <button className="px-6 py-2.5 rounded-full border-2 border-primary/30 bg-white text-foreground font-bold text-sm hover:bg-primary/5 transition-colors">
                    New Arrivals
                  </button>
                </Link>
              </div>
            </div>

            {/* Hero image sits below text, bleeds to the right on mobile */}
            {heroImgOk && (
              <div className="relative h-44 -mx-6 overflow-hidden">
                <img
                  src="/hero.jpg"
                  alt="Kawaii products"
                  onError={() => setHeroImgOk(false)}
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-pink-50/80 via-transparent to-transparent" />
              </div>
            )}
          </div>

          {/* Desktop hero: full-width image with left overlay */}
          <div className="hidden md:flex relative min-h-[520px] items-center">
            <div className="absolute inset-0">
              <img
                src="/hero.jpg"
                alt="Kawaii stationery flat lay"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-background/10" />
            </div>
            <div className="relative container py-16">
              <div className="max-w-lg space-y-5">
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 border border-primary/30 px-4 py-1.5 text-sm font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5 fill-primary/40" /> New collection just dropped
                </span>
                <h1 className="text-6xl font-extrabold leading-[1.05] tracking-tight uppercase bg-gradient-primary bg-clip-text text-transparent">
                  Cotton Cloud<br />Company
                </h1>
                <p className="text-lg text-foreground/80 max-w-sm font-[Fredoka]">
                  Your happy place for all things cute &amp; quirky 🌸
                </p>
                <div className="flex gap-3 pt-2">
                  <Link href="/shop">
                    <button className="px-7 py-3 rounded-full bg-gradient-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity">
                      Shop Now
                    </button>
                  </Link>
                  <Link href="#new-arrivals">
                    <button className="px-7 py-3 rounded-full border-2 border-primary/40 bg-background text-foreground font-bold text-sm hover:bg-primary/10 transition-colors">
                      New Arrivals
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CATEGORY SCROLL ── */}
        <section className="bg-card border-y border-border py-4 md:py-5">
          <div className="container">
            <div className="flex gap-4 md:gap-5 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
              {CATEGORIES.map((c) => (
                <Link
                  key={c.slug}
                  href={`/shop/${c.slug}`}
                  className="group flex-shrink-0 flex flex-col items-center gap-1.5 w-[64px] md:w-[88px]"
                >
                  <div
                    className="h-14 w-14 md:h-20 md:w-20 grid place-items-center rounded-full text-2xl md:text-3xl border border-border/60 group-hover:scale-110 group-hover:border-primary/30 transition-bounce"
                    style={{ backgroundColor: c.bg }}
                  >
                    {c.emoji}
                  </div>
                  <p className="text-[10px] md:text-xs font-semibold text-center leading-tight text-foreground">{c.name}</p>
                </Link>
              ))}
              <Link
                href="/shop"
                className="group flex-shrink-0 flex flex-col items-center gap-1.5 w-[64px] md:w-[88px]"
              >
                <div className="h-14 w-14 md:h-20 md:w-20 grid place-items-center rounded-full bg-gradient-primary text-primary-foreground text-xl md:text-2xl group-hover:scale-110 transition-bounce">
                  →
                </div>
                <p className="text-[10px] md:text-xs font-semibold text-center text-primary">View all</p>
              </Link>
            </div>
          </div>
        </section>

        {/* ── PROMO BANNERS ── */}
        <section className="container py-5 md:py-8">
          <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4">

            <Link
              href="/shop?sort=newest"
              className="group relative overflow-hidden rounded-2xl md:rounded-3xl min-h-[130px] md:min-h-[200px] flex items-end p-4 md:p-7 border border-border/60 transition-bounce"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-pink-100 via-purple-50 to-pink-50" />
              <div className="absolute right-2 top-0 bottom-0 flex items-center text-[56px] md:text-[88px] opacity-20 group-hover:opacity-35 group-hover:scale-110 transition-bounce select-none">
                🌸
              </div>
              <div className="relative z-10">
                <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-0.5 md:mb-1">Just arrived</p>
                <h3 className="text-base md:text-2xl font-extrabold text-foreground mb-1.5 md:mb-3">New Arrivals ✨</h3>
                <span className="text-xs md:text-sm font-bold text-primary underline underline-offset-2">
                  Explore →
                </span>
              </div>
            </Link>

            <Link
              href="/shop?sort=popular"
              className="group relative overflow-hidden rounded-2xl md:rounded-3xl min-h-[130px] md:min-h-[200px] flex items-end p-4 md:p-7 border border-border/60 transition-bounce"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50" />
              <div className="absolute right-2 top-0 bottom-0 flex items-center text-[56px] md:text-[88px] opacity-20 group-hover:opacity-35 group-hover:scale-110 transition-bounce select-none">
                🏆
              </div>
              <div className="relative z-10">
                <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-0.5 md:mb-1">Customer favorites</p>
                <h3 className="text-base md:text-2xl font-extrabold text-foreground mb-1.5 md:mb-3">Best Sellers 🌟</h3>
                <span className="text-xs md:text-sm font-bold text-primary underline underline-offset-2">
                  Shop now →
                </span>
              </div>
            </Link>
          </div>
        </section>

        {/* ── TRENDING PRODUCTS ── */}
        <section id="new-arrivals" className="container pb-8 md:pb-10 scroll-mt-20">
          <div className="flex items-end justify-between mb-4 md:mb-6">
            <div>
              <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-0.5 md:mb-1">Handpicked for you</p>
              <h2 className="text-2xl md:text-3xl font-bold">Trending Now</h2>
            </div>
            <Link href="/shop" className="text-sm text-primary font-bold hover:underline shrink-0">View all →</Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-2xl md:rounded-3xl" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-card border border-border/60">
              <div className="text-5xl mb-3">🧸</div>
              <p className="text-muted-foreground text-sm">No products yet — sign in as admin to add some!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {products.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          )}
        </section>

        {/* ── WIDE DEAL BANNER ── */}
        <section className="container pb-8 md:pb-10">
          <Link
            href="/shop"
            className="group relative overflow-hidden rounded-2xl md:rounded-3xl flex items-center min-h-[110px] md:min-h-[180px] border border-border/60 transition-bounce"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-100 via-pink-50 to-amber-50" />
            <div className="absolute right-4 md:right-16 top-0 bottom-0 flex items-center text-4xl md:text-7xl opacity-20 group-hover:opacity-35 group-hover:scale-110 transition-bounce select-none gap-1 md:gap-2">
              🎀🎁🌈
            </div>
            <div className="relative z-10 px-5 md:px-12">
              <p className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5 md:mb-1">Thoughtful picks</p>
              <h3 className="text-lg md:text-3xl font-extrabold text-foreground mb-2 md:mb-3">Gifts under ₹499 🎁</h3>
              <span className="inline-flex items-center gap-1 text-xs md:text-sm font-bold text-primary bg-primary/10 px-4 md:px-5 py-1.5 md:py-2 rounded-full">
                Shop gifts →
              </span>
            </div>
          </Link>
        </section>

      </main>
      <Footer />
    </div>
  );
}
