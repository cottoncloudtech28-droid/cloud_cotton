"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/components/shop/Navbar";
import ProductCard, { Product } from "@/components/shop/ProductCard";
import { apiFetch } from "@/lib/api";
import { Cloud, Heart, Truck, Sparkles } from "lucide-react";
import Footer from "@/components/shop/Footer";

const CATEGORIES = [
  { slug: "stationery", name: "Stationery", emoji: "🌸", bg: "#fff0f5" },
  { slug: "lunch-boxes", name: "Lunch Boxes", emoji: "🍡", bg: "#fff8e1" },
  { slug: "bottles", name: "Bottles", emoji: "🫧", bg: "#e3f2fd" },
  { slug: "lamps", name: "Lamps", emoji: "🌙", bg: "#fffde7" },
  { slug: "return-gifts", name: "Return Gifts", emoji: "🎀", bg: "#fce4ec" },
  { slug: "speakers", name: "Bluetooth Speakers", emoji: "🎧", bg: "#f3e5f5" },
  { slug: "toys", name: "Toys", emoji: "🐻", bg: "#e8f5e9" },
  { slug: "quirky", name: "Quirky Items", emoji: "🦄", bg: "#e0f7fa" },
  { slug: "mixed", name: "Mixed Items", emoji: "🍭", bg: "#fbe9e7" },
];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    apiFetch("/api/products")
      .then((data) => setProducts((data || []).slice(0, 8)))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>

        {/* ── HERO ── first thing visitors see */}
        <section className="relative overflow-hidden">
          <div className="container grid md:grid-cols-2 gap-8 items-center py-12 md:py-24">
            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-700">
              <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground">
                <Cloud className="h-3.5 w-3.5" /> Freshly stocked &amp; oh-so-cute
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
              <div className="flex gap-3 pt-2">
                <Link href="/shop">
                  <button className="px-6 py-3 rounded-full bg-gradient-primary text-primary-foreground font-semibold text-sm shadow-cute hover:opacity-90 transition-opacity">
                    Shop now
                  </button>
                </Link>
                <Link href="#categories">
                  <button className="px-6 py-3 rounded-full border border-border bg-card text-foreground font-semibold text-sm hover:bg-muted transition-colors">
                    Browse categories
                  </button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-primary opacity-20 blur-3xl rounded-full" />
              <img
                src="/hero.jpg"
                alt="Kawaii stationery flat lay"
                width={1536}
                height={896}
                className="relative rounded-[2rem] shadow-cute w-full h-auto"
              />
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="container py-6 grid sm:grid-cols-3 gap-4">
          {[
            { icon: Heart, t: "Picked with love", d: "Every item curated by us" },
            { icon: Truck, t: "Cozy packaging", d: "Wrapped like a gift" },
            { icon: Sparkles, t: "Sparkly deals", d: "Discounts every week" },
          ].map(({ icon: I, t, d }) => (
            <div key={t} className="flex items-center gap-4 p-5 rounded-3xl bg-card shadow-soft">
              <div className="h-12 w-12 grid place-items-center rounded-2xl bg-gradient-primary text-primary-foreground">
                <I className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">{t}</p>
                <p className="text-sm text-muted-foreground">{d}</p>
              </div>
            </div>
          ))}
        </section>

        {/* ── LATEST CUTIES ── */}
        <section className="container py-12">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-3xl font-bold">Latest cuties</h2>
            <Link href="/shop" className="text-sm text-primary font-medium hover:underline">View all →</Link>
          </div>
          {products.length === 0 ? (
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

        {/* ── CATEGORIES ── */}
        <section className="container py-12">
          <div id="categories" className="text-center mb-8 scroll-mt-20">
            <h2 className="text-3xl md:text-4xl font-bold">Shop the cuteness by category</h2>
            <p className="text-muted-foreground mt-2">Find your next favorite thing</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/shop?cat=${c.slug}`}
                className="group flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-card shadow-soft hover:shadow-cute transition-all hover:-translate-y-1"
              >
                <div
                  className="h-16 w-16 grid place-items-center rounded-2xl text-3xl group-hover:scale-110 transition-transform shadow-sm"
                  style={{ backgroundColor: c.bg }}
                >
                  {c.emoji}
                </div>
                <p className="font-semibold text-center">{c.name}</p>
              </Link>
            ))}
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
