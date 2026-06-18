"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/components/shop/Navbar";
import ProductCard, { Product } from "@/components/shop/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { Sparkles } from "lucide-react";
import Footer from "@/components/shop/Footer";

const CATEGORIES = [
  { slug: "stationery", name: "Stationery", emoji: "🌸", bg: "#fff0f5" },
  { slug: "lunch-boxes", name: "Lunch Boxes", emoji: "🍡", bg: "#fff8e1" },
  { slug: "bottles", name: "Bottles", emoji: "🫧", bg: "#e3f2fd" },
  { slug: "lamps", name: "Lamps", emoji: "🌙", bg: "#fffde7" },
  { slug: "return-gifts", name: "Return Gifts", emoji: "🎀", bg: "#fce4ec" },
  { slug: "speakers", name: "Speakers", emoji: "🎧", bg: "#f3e5f5" },
  { slug: "toys", name: "Toys", emoji: "🐻", bg: "#e8f5e9" },
  { slug: "quirky", name: "Quirky Items", emoji: "🦄", bg: "#e0f7fa" },
  { slug: "mixed", name: "Mixed Items", emoji: "🍭", bg: "#fbe9e7" },
];

const PERKS = [
  { emoji: "🚚", title: "Free Delivery", desc: "On orders above ₹499" },
  { emoji: "♻️", title: "Easy Returns", desc: "15-day hassle-free" },
  { emoji: "💳", title: "Secure Payment", desc: "100% safe checkout" },
  { emoji: "🎀", title: "Gift Wrapping", desc: "Free on request" },
];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/products")
      .then((data) => setProducts((data || []).slice(0, 8)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">

      {/* ── ANNOUNCEMENT BAR ── */}
      <div className="bg-gradient-primary text-primary-foreground text-center text-xs py-2 font-semibold tracking-wide">
        🎀 Free shipping on orders over ₹499 &nbsp;·&nbsp; New arrivals every week ✨ &nbsp;·&nbsp; Easy 15-day returns 🌸
      </div>

      <Navbar />

      <main>

        {/* ── HERO ── full-width with overlay */}
        <section className="relative overflow-hidden min-h-[420px] md:min-h-[540px] flex items-center">
          <div className="absolute inset-0">
            <img
              src="/hero.jpg"
              alt="Kawaii stationery flat lay"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
          </div>
          <div className="relative container py-16">
            <div className="max-w-lg space-y-5 animate-in fade-in slide-in-from-left-4 duration-700">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 backdrop-blur border border-primary/30 px-4 py-1.5 text-sm font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5 fill-primary/40" /> New collection just dropped
              </span>
              <h1 className="text-5xl md:text-6xl font-extrabold leading-[1.05] tracking-tight uppercase bg-gradient-primary bg-clip-text text-transparent">
                Cotton Cloud<br />Company
              </h1>
              <p className="text-lg text-foreground/80 max-w-sm font-[Fredoka]">
                Your happy place for all things cute &amp; quirky 🌸
              </p>
              <div className="flex gap-3 pt-2">
                <Link href="/shop">
                  <button className="px-7 py-3 rounded-full bg-gradient-primary text-primary-foreground font-bold text-sm shadow-cute hover:opacity-90 transition-opacity">
                    Shop Now
                  </button>
                </Link>
                <Link href="#new-arrivals">
                  <button className="px-7 py-3 rounded-full border-2 border-primary/30 bg-background/70 backdrop-blur text-foreground font-bold text-sm hover:bg-muted transition-colors">
                    New Arrivals
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── CATEGORY SCROLL ── */}
        <section className="bg-card border-y border-border py-5">
          <div className="container">
            <div className="flex gap-5 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
              {CATEGORIES.map((c) => (
                <Link
                  key={c.slug}
                  href={`/shop?cat=${c.slug}`}
                  className="group flex-shrink-0 flex flex-col items-center gap-2 w-[72px] md:w-[88px]"
                >
                  <div
                    className="h-16 w-16 md:h-20 md:w-20 grid place-items-center rounded-full text-3xl shadow-soft group-hover:scale-110 group-hover:shadow-cute transition-bounce"
                    style={{ backgroundColor: c.bg }}
                  >
                    {c.emoji}
                  </div>
                  <p className="text-xs font-semibold text-center leading-tight text-foreground">{c.name}</p>
                </Link>
              ))}
              <Link
                href="/shop"
                className="group flex-shrink-0 flex flex-col items-center gap-2 w-[72px] md:w-[88px]"
              >
                <div className="h-16 w-16 md:h-20 md:w-20 grid place-items-center rounded-full bg-gradient-primary text-primary-foreground text-2xl shadow-cute group-hover:scale-110 transition-bounce">
                  →
                </div>
                <p className="text-xs font-semibold text-center text-primary">View all</p>
              </Link>
            </div>
          </div>
        </section>

        {/* ── PROMO BANNERS ── 2-up */}
        <section className="container py-8">
          <div className="grid md:grid-cols-2 gap-4">
            <Link
              href="/shop?sort=new"
              className="group relative overflow-hidden rounded-3xl min-h-[200px] flex items-end p-7 shadow-soft hover:shadow-cute transition-bounce"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-pink-100 via-purple-50 to-pink-50" />
              <div className="absolute right-4 top-0 bottom-0 flex items-center text-[88px] opacity-25 group-hover:opacity-40 group-hover:scale-110 transition-bounce select-none">
                🌸
              </div>
              <div className="relative z-10">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Just arrived</p>
                <h3 className="text-2xl font-extrabold text-foreground mb-3">New Arrivals ✨</h3>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-primary underline underline-offset-2">
                  Explore now →
                </span>
              </div>
            </Link>

            <Link
              href="/shop?sort=popular"
              className="group relative overflow-hidden rounded-3xl min-h-[200px] flex items-end p-7 shadow-soft hover:shadow-cute transition-bounce"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50" />
              <div className="absolute right-4 top-0 bottom-0 flex items-center text-[88px] opacity-25 group-hover:opacity-40 group-hover:scale-110 transition-bounce select-none">
                🏆
              </div>
              <div className="relative z-10">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Customer favorites</p>
                <h3 className="text-2xl font-extrabold text-foreground mb-3">Best Sellers 🌟</h3>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-primary underline underline-offset-2">
                  Shop now →
                </span>
              </div>
            </Link>
          </div>
        </section>

        {/* ── TRENDING PRODUCTS ── */}
        <section id="new-arrivals" className="container py-2 pb-10 scroll-mt-20">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Handpicked for you</p>
              <h2 className="text-3xl font-bold">Trending Now</h2>
            </div>
            <Link href="/shop" className="text-sm text-primary font-bold hover:underline">View all →</Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-3xl" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 rounded-3xl bg-card shadow-soft">
              <div className="text-6xl mb-3">🧸</div>
              <p className="text-muted-foreground">No products yet — sign in as admin to add some!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          )}
        </section>

        {/* ── WIDE DEAL BANNER ── */}
        <section className="container pb-10">
          <Link
            href="/shop"
            className="group relative overflow-hidden rounded-3xl flex items-center min-h-[140px] md:min-h-[180px] shadow-soft hover:shadow-cute transition-bounce"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-100 via-pink-50 to-amber-50" />
            <div className="absolute right-6 md:right-16 top-0 bottom-0 flex items-center text-5xl md:text-7xl opacity-20 group-hover:opacity-35 group-hover:scale-110 transition-bounce select-none gap-2">
              🎀🎁🌈
            </div>
            <div className="relative z-10 px-8 md:px-12">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Thoughtful picks</p>
              <h3 className="text-2xl md:text-3xl font-extrabold text-foreground mb-3">Gifts under ₹499 🎁</h3>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-primary bg-primary/10 px-5 py-2 rounded-full">
                Shop gifts →
              </span>
            </div>
          </Link>
        </section>

        {/* ── PERKS BAR ── */}
        {/* <section className="bg-card border-y border-border py-7">
          <div className="container grid grid-cols-2 md:grid-cols-4 gap-6">
            {PERKS.map(({ emoji, title, desc }) => (
              <div key={title} className="flex flex-col sm:flex-row items-center sm:items-start gap-3 text-center sm:text-left">
                <div className="h-12 w-12 flex-shrink-0 grid place-items-center rounded-2xl bg-gradient-hero text-2xl shadow-soft">
                  {emoji}
                </div>
                <div>
                  <p className="font-bold text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section> */}
      </main>
      <Footer />
    </div>
  );
}
