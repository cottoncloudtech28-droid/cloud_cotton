"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/components/shop/Navbar";
import ProductCard from "@/components/shop/ProductCard";
import type { Product } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { Sparkles, Pencil, UtensilsCrossed, Droplets, Lightbulb, Gift, Volume2, Gamepad2, Wand2, ShoppingBag } from "lucide-react";
import Footer from "@/components/shop/Footer";

const CATEGORIES = [
  { slug: "stationery",   name: "Stationery",   icon: Pencil,          bg: "#fff0f5", color: "#d63384" },
  { slug: "lunch-boxes",  name: "Lunch Boxes",  icon: UtensilsCrossed, bg: "#fff8e1", color: "#e67700" },
  { slug: "bottles",      name: "Bottles",      icon: Droplets,        bg: "#e3f2fd", color: "#0077c2" },
  { slug: "lamps",        name: "Lamps",        icon: Lightbulb,       bg: "#fffde7", color: "#b8860b" },
  { slug: "return-gifts", name: "Return Gifts", icon: Gift,            bg: "#fce4ec", color: "#c2185b" },
  { slug: "speakers",     name: "Speakers",     icon: Volume2,         bg: "#f3e5f5", color: "#7b1fa2" },
  { slug: "toys",         name: "Toys",         icon: Gamepad2,        bg: "#e8f5e9", color: "#2e7d32" },
  { slug: "quirky",       name: "Quirky Items", icon: Wand2,           bg: "#e0f7fa", color: "#00838f" },
  { slug: "mixed",        name: "Mixed Items",  icon: ShoppingBag,     bg: "#fbe9e7", color: "#bf360c" },
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
                    className="h-14 w-14 md:h-20 md:w-20 grid place-items-center rounded-full border border-border/60 group-hover:scale-110 group-hover:border-primary/30 transition-bounce"
                    style={{ backgroundColor: c.bg }}
                  >
                    <c.icon className="h-6 w-6 md:h-8 md:w-8" style={{ color: c.color }} />
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


        {/* ── TESTIMONIALS ── */}
        <section className="container pb-10 md:pb-14">
          <div className="text-center mb-6 md:mb-8">
            <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-0.5 md:mb-1">Happy customers</p>
            <h2 className="text-2xl md:text-3xl font-bold">What people are saying 💬</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {[
              {
                name: "Aanya S.",
                location: "Mumbai",
                avatar: "🌸",
                rating: 5,
                text: "The stationery set I ordered was absolutely adorable! Great packaging and super fast delivery. Will definitely be ordering again!",
              },
              {
                name: "Rhea M.",
                location: "Bangalore",
                avatar: "🎀",
                rating: 5,
                text: "Bought return gifts for my daughter's birthday party — every single kid was obsessed. The quality exceeded my expectations!",
              },
              {
                name: "Priya K.",
                location: "Delhi",
                avatar: "🌈",
                rating: 5,
                text: "Cotton Cloud has the cutest things ever! The kawaii lamp is now my desk's star. Highly recommend to anyone who loves cute decor.",
              },
            ].map((t) => (
              <div
                key={t.name}
                className="relative rounded-2xl md:rounded-3xl bg-card border border-border/60 p-5 md:p-6 flex flex-col gap-3"
              >
                {/* Stars */}
                <div className="flex gap-0.5 text-amber-400 text-sm">
                  {"★".repeat(t.rating)}
                </div>

                {/* Quote */}
                <p className="text-sm text-foreground/80 leading-relaxed flex-1">"{t.text}"</p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-1 border-t border-border/40">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 border border-border/40 grid place-items-center text-lg flex-shrink-0">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground leading-none">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
