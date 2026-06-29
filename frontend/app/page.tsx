"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";
import ProductCard from "@/components/shop/ProductCard";
import type { Product, Category } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { Sparkles, Cloud, ShoppingBag } from "lucide-react";

const hero = "/hero.jpg";

const FALLBACK_REVIEWS = [
  { id: "f1", name: "Aanya S.", location: "Mumbai", avatar: "🌸", rating: 5, text: "The stationery set I ordered was absolutely adorable! Great packaging and super fast delivery. Will definitely be ordering again!" },
  { id: "f2", name: "Rhea M.",  location: "Bangalore", avatar: "🎀", rating: 5, text: "Bought return gifts for my daughter's birthday party — every single kid was obsessed. The quality exceeded my expectations!" },
  { id: "f3", name: "Priya K.", location: "Delhi",     avatar: "🌈", rating: 5, text: "Cotton Cloud has the cutest things ever! The kawaii lamp is now my desk's star. Highly recommend to anyone who loves cute decor." },
];

const AVATARS = ["🌸", "🎀", "🌈", "🍭", "✨", "🦋", "🌷", "🎐"];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<typeof FALLBACK_REVIEWS>(FALLBACK_REVIEWS);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/products?limit=8&sort=newest")
      .then((data) => setProducts((data?.products || data || []).slice(0, 8)))
      .catch(() => {})
      .finally(() => setLoading(false));

    apiFetch("/api/categories")
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});

    apiFetch("/api/reviews?limit=6")
      .then((data) => {
        const fetched = (data?.reviews ?? []).slice(0, 3);
        if (fetched.length > 0) {
          setReviews(
            fetched.map((r: any, i: number) => ({
              id: r.id,
              name: r.user?.name ?? r.guest_name ?? "Happy Customer",
              location: "",
              avatar: AVATARS[i % AVATARS.length],
              rating: r.rating,
              text: r.body || r.title || "",
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
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
          <div className="container grid md:grid-cols-2 gap-8 items-center py-12 md:py-20">
            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-700">
              <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground">
                <Cloud className="h-3.5 w-3.5" /> Freshly stocked & oh-so-cute
              </span>

              <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight uppercase bg-gradient-primary bg-clip-text text-transparent">
                Cotton Cloud<br />Company
              </h1>

              <p className="text-2xl md:text-3xl max-w-md font-[Fredoka] italic text-secondary-foreground">
                <span className="relative inline-block">
                  <span className="absolute inset-x-0 bottom-1 h-3 bg-accent/70 -z-10 rounded-sm" />
                  Your happy place
                </span>{" "}
                for all things{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent font-bold">cute &amp; quirky</span>
                <Sparkles className="inline-block ml-1 h-5 w-5 text-primary fill-primary/40" />
              </p>

              <p className="text-base text-muted-foreground max-w-md">
                Hand-picked kawaii stationery, quirky knick-knacks and irresistibly cute toys.
                Made for daydreamers and desk-decorators.
              </p>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-primary opacity-20 blur-3xl rounded-full" />
              <img src={hero} alt="Kawaii stationery flat lay" width={1536} height={896}
                className="relative rounded-[2rem] shadow-cute w-full h-auto" />
            </div>
          </div>
        </section>


        {/* ── CATEGORY SCROLL ── */}
        <section className="bg-card border-y border-border py-4 md:py-5">
          <div className="container">
            <div className="flex gap-4 md:gap-5 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/shop/${c.slug}`}
                  className="group flex-shrink-0 flex flex-col items-center gap-1.5 w-[64px] md:w-[88px]"
                >
                  <div className="h-14 w-14 md:h-20 md:w-20 rounded-full border border-border/60 group-hover:scale-110 group-hover:border-primary/30 transition-bounce overflow-hidden bg-muted flex items-center justify-center">
                    {c.banner_url ? (
                      <img
                        src={c.banner_url}
                        alt={c.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl md:text-3xl">{c.emoji}</span>
                    )}
                  </div>
                  <p className="text-[10px] md:text-xs font-semibold text-center leading-tight text-foreground">{c.name}</p>
                </Link>
              ))}
              <Link
                href="/shop"
                className="group flex-shrink-0 flex flex-col items-center gap-1.5 w-[64px] md:w-[88px]"
              >
                <div className="h-14 w-14 md:h-20 md:w-20 grid place-items-center rounded-full bg-gradient-primary text-primary-foreground group-hover:scale-110 transition-bounce">
                  <ShoppingBag className="h-6 w-6 md:h-7 md:w-7" />
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
            {reviewsLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 rounded-2xl md:rounded-3xl" />
                ))
              : reviews.map((t) => (
                  <div
                    key={t.id}
                    className="relative rounded-2xl md:rounded-3xl bg-card border border-border/60 p-5 md:p-6 flex flex-col gap-3"
                  >
                    <div className="flex gap-0.5 text-amber-400 text-sm">
                      {"★".repeat(t.rating)}
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed flex-1">"{t.text}"</p>
                    <div className="flex items-center gap-3 pt-1 border-t border-border/40">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 border border-border/40 grid place-items-center text-lg flex-shrink-0">
                        {t.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground leading-none">{t.name}</p>
                        {t.location && <p className="text-xs text-muted-foreground mt-0.5">{t.location}</p>}
                      </div>
                    </div>
                  </div>
                ))
            }
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
