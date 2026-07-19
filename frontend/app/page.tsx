"use client";

import Footer from "@/components/shop/Footer";
import Navbar from "@/components/shop/Navbar";
import ProductCard from "@/components/shop/ProductCard";
import WriteReviewSheet from "@/components/shop/WriteReviewSheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Category, Product } from "@/lib/types";
import { Cloud, ShoppingBag, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

const hero = "/hero.jpg";

const FALLBACK_REVIEWS = [
  { id: "f1", name: "Aanya S.", location: "Mumbai", avatar: "🌸", rating: 5, text: "The stationery set I ordered was absolutely adorable! Great packaging and super fast delivery. Will definitely be ordering again!" },
  { id: "f2", name: "Rhea M.",  location: "Bangalore", avatar: "🎀", rating: 5, text: "Bought return gifts for my daughter's birthday party — every single kid was obsessed. The quality exceeded my expectations!" },
  { id: "f3", name: "Priya K.", location: "Delhi",     avatar: "🌈", rating: 5, text: "Cotton Cloud has the cutest things ever! The kawaii lamp is now my desk's star. Highly recommend to anyone who loves cute decor." },
  { id: "f4", name: "Ishita V.", location: "Pune",     avatar: "🍭", rating: 5, text: "The bento box is even cuter in person and keeps my lunch warm for hours. Obsessed with this shop!" },
  { id: "f5", name: "Meher K.", location: "Chennai",   avatar: "🦋", rating: 5, text: "Ordered a lamp for my study table and it's the coziest thing ever. Packaging felt so premium too." },
];

const AVATARS = ["🌸", "🎀", "🌈", "🍭", "✨", "🦋", "🌷", "🎐"];

// ── Shared motion variants ────────────────────────────────────────────────────
const heroContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const heroItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};
const sectionHeading: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};
const gridContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const gridItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

export default function Home() {
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [reviews, setReviews] = useState<typeof FALLBACK_REVIEWS>(FALLBACK_REVIEWS);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [marqueePaused, setMarqueePaused] = useState(false);
  const [writeReviewOpen, setWriteReviewOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Fisher-Yates shuffle (creates a new array)
  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  useEffect(() => {
    // Fetch newest + popular in parallel, then deduplicate and shuffle
    Promise.all([
      apiFetch("/api/products?limit=12&sort=newest"),
      apiFetch("/api/products?limit=12&sort=popular"),
    ])
      .then(([newestData, popularData]) => {
        const newest: Product[] = (newestData?.products || newestData || []).slice(0, 12);
        const popular: Product[] = (popularData?.products || popularData || []).slice(0, 12);

        // New Arrivals must actually show the newest products, so keep them in
        // createdAt order (no shuffle) — a just-added product always lands at the
        // front instead of having a ~2/3 chance of being shuffled out.
        const arrivals = newest.slice(0, 8);

        // Best sellers stay shuffled for variety; drop anything already in arrivals.
        const arrivalIds = new Set(arrivals.map((p) => p.id));
        const filteredPopular = shuffle(popular).filter((p) => !arrivalIds.has(p.id));

        // If not enough unique popular products, fill from remaining newest.
        const remainingNewest = newest.filter(
          (p) => !arrivalIds.has(p.id) && !filteredPopular.some((fp) => fp.id === p.id)
        );
        const sellers = [...filteredPopular, ...remainingNewest].slice(0, 8);

        setNewArrivals(arrivals);
        setBestSellers(sellers);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    apiFetch("/api/categories")
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setCategoriesLoading(false));

    apiFetch("/api/reviews?limit=10")
      .then((data) => {
        const fetched = (data?.reviews ?? []).slice(0, 8);
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
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-gradient-primary text-primary-foreground text-center text-xs py-2 font-semibold tracking-wide"
      >
        <motion.span
          className="inline-block"
          {...(!prefersReducedMotion && {
            animate: { scale: [1, 1.2, 1] },
            transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
          })}
        >
          ✨
        </motion.span>{" "}
        Free shipping on orders above ₹1,499 &nbsp;·&nbsp; New arrivals every week{" "}
        <motion.span
          className="inline-block"
          {...(!prefersReducedMotion && {
            animate: { rotate: [0, 12, -12, 0] },
            transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
          })}
        >
          💖
        </motion.span>
      </motion.div>

      <Navbar />

      <main>

        {/* ── HERO ── */}
        <section className="relative overflow-hidden">
          <div className="container grid md:grid-cols-[1fr_1.2fr] gap-6 md:gap-8 items-center pt-8 md:pt-20 pb-6 md:pb-8">
            <motion.div
              className="space-y-5 text-center md:text-left"
              variants={heroContainer}
              initial="hidden"
              animate="show"
            >
              <motion.span variants={heroItem} className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground">
                <Cloud className="h-3.5 w-3.5" /> Freshly stocked &amp; oh-so-cute
              </motion.span>

              <motion.h1 variants={heroItem} className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight uppercase bg-gradient-primary bg-clip-text text-transparent">
                Cotton Cloud<br />Company
              </motion.h1>

              <motion.p variants={heroItem} className="text-xl md:text-3xl max-w-md mx-auto md:mx-0 font-[Fredoka] italic text-secondary-foreground">
                <span className="relative inline-block">
                  <span className="absolute inset-x-0 bottom-1 h-3 bg-accent/70 -z-10 rounded-sm" />
                  Your happy place
                </span>{" "}
                for all things{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent font-bold">cute &amp; quirky</span>
                <motion.span
                  className="inline-block ml-1"
                  {...(!prefersReducedMotion && {
                    animate: { rotate: [0, 15, -10, 0], scale: [1, 1.15, 1] },
                    transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
                  })}
                >
                  <Sparkles className="inline-block h-5 w-5 text-primary fill-primary/40" />
                </motion.span>
              </motion.p>

              <motion.p variants={heroItem} className="text-base text-muted-foreground max-w-md mx-auto md:mx-0">
                Hand-picked kawaii stationery, quirky knick-knacks and irresistibly cute toys.
                Made for daydreamers and desk-decorators.
              </motion.p>
            </motion.div>

            <motion.div
              className="relative mt-4 md:mt-0 md:-mr-4 lg:-mr-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <img
                src={hero} alt="Kawaii stationery flat lay" width={1536} height={896}
                className="relative rounded-[2rem] shadow-cute w-full h-auto"
              />
            </motion.div>
          </div>
        </section>


        {/* ── CATEGORY SHOWCASE ── */}
        <section className="relative overflow-hidden pt-2 md:pt-4 pb-8 md:pb-12">
          {/* decorative floating blobs */}
          <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-accent/20 blur-3xl pointer-events-none" />

          <div className="container relative">
            <motion.div
              className="text-center mb-6 md:mb-8"
              variants={sectionHeading}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.6 }}
            >
              <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-0.5 md:mb-1">Pick your vibe</p>
              <h2 className="text-2xl md:text-3xl font-bold">Shop by Category <span className="inline-block">💖</span></h2>
            </motion.div>

            <motion.div
              className="flex gap-5 md:gap-8 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-8 pt-8 md:pt-10 md:pb-10 -mx-1 px-1"
              variants={gridContainer}
              initial="hidden"
              animate="show"
            >
              {categoriesLoading ? (
                Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2 w-[88px] md:w-[112px]">
                    <Skeleton className="h-20 w-20 md:h-28 md:w-28 rounded-[45%_55%_60%_40%/55%_35%_65%_45%]" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                ))
              ) : (
                <>
                  {categories.map((c, i) => {
                    const palette = [
                      "from-pink-200 via-pink-100 to-rose-50",
                      "from-violet-200 via-purple-100 to-indigo-50",
                      "from-amber-200 via-orange-100 to-yellow-50",
                      "from-sky-200 via-cyan-100 to-blue-50",
                      "from-emerald-200 via-green-100 to-lime-50",
                      "from-fuchsia-200 via-pink-100 to-purple-50",
                    ];
                    const blobShape = i % 2 === 0
                      ? "rounded-[42%_58%_65%_35%/55%_35%_65%_45%]"
                      : "rounded-[60%_40%_35%_65%/45%_60%_40%_55%]";
                    const tilt = i % 3 === 0 ? "rotate-[-5deg]" : i % 3 === 1 ? "rotate-[5deg]" : "rotate-[-2deg]";

                    return (
                      <motion.div
                        key={c.slug}
                        variants={gridItem}
                        className="flex-shrink-0 snap-center"
                        whileHover={{ y: -6, scale: 1.06, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 15 }}
                      >
                        <Link
                          href={`/shop/${c.slug}`}
                          className="group flex flex-col items-center gap-2 w-[88px] md:w-[112px]"
                        >
                          <div
                            className={cn(
                              "relative h-20 w-20 md:h-28 md:w-28 bg-gradient-to-br overflow-hidden flex items-center justify-center transition-bounce",
                              "shadow-[0_10px_28px_-10px_rgba(120,70,150,0.35)] group-hover:shadow-[0_16px_36px_-10px_rgba(120,70,150,0.45)]",
                              palette[i % palette.length],
                              blobShape,
                              tilt,
                              "group-hover:rotate-0"
                            )}
                          >
                            {c.banner_url ? (
                              <img
                                src={c.banner_url}
                                alt={c.name}
                                className="w-full h-full object-cover scale-110 group-hover:scale-125 transition-bounce"
                              />
                            ) : (
                              <span className="text-4xl md:text-5xl drop-shadow-sm">{c.emoji}</span>
                            )}
                          </div>
                          <span className="rounded-2xl bg-gradient-primary text-primary-foreground px-3 py-1.5 text-[11px] md:text-sm font-extrabold uppercase tracking-wide text-center leading-tight shadow-md ring-1 ring-white/30 group-hover:shadow-lg group-hover:-translate-y-0.5 transition-bounce">
                            {c.name}
                          </span>
                        </Link>
                      </motion.div>
                    );
                  })}
                  <motion.div
                    variants={gridItem}
                    className="flex-shrink-0 snap-center"
                    whileHover={{ y: -6, scale: 1.06, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <Link
                      href="/shop"
                      className="group flex flex-col items-center gap-2 w-[104px] md:w-[132px]"
                    >
                      <div className="h-24 w-24 md:h-32 md:w-32 grid place-items-center bg-gradient-primary text-primary-foreground rounded-[55%_45%_40%_60%/50%_60%_40%_50%] rotate-[3deg] group-hover:rotate-0 shadow-[0_10px_28px_-8px_rgba(120,70,150,0.5)] transition-bounce">
                        <ShoppingBag className="h-7 w-7 md:h-9 md:w-9" />
                      </div>
                      <span className="rounded-full bg-gradient-primary text-primary-foreground px-3 py-1 text-[10px] md:text-xs font-bold text-center shadow-sm transition-bounce">
                        View all
                      </span>
                    </Link>
                  </motion.div>
                </>
              )}
            </motion.div>
          </div>
        </section>


        {/* ── NEW ARRIVALS ── */}
        <section id="new-arrivals" className="container pb-6 md:pb-8 scroll-mt-20">
          <motion.div
            className="flex items-end justify-between mb-4 md:mb-6"
            variants={sectionHeading}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
          >
            <div>
              <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-0.5 md:mb-1">Just arrived</p>
              <h2 className="text-2xl md:text-3xl font-bold">New Arrivals ✨</h2>
            </div>
            <Link href="/shop?sort=newest" className="text-sm text-primary font-bold hover:underline shrink-0">View all →</Link>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-2xl md:rounded-3xl" />
              ))}
            </div>
          ) : newArrivals.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-card border border-border/60">
              <div className="text-5xl mb-3">🧸</div>
              <p className="text-muted-foreground text-sm">No products yet — sign in as admin to add some!</p>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4"
              variants={gridContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.1 }}
            >
              {newArrivals.map((p) => (
                <motion.div key={p.id} variants={gridItem}>
                  <ProductCard p={p} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        {/* ── BEST SELLERS ── */}
        {!loading && bestSellers.length > 0 && (
          <section className="container pb-8 md:pb-10">
            <motion.div
              className="flex items-end justify-between mb-4 md:mb-6"
              variants={sectionHeading}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.6 }}
            >
              <div>
                <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-0.5 md:mb-1">Customer favorites</p>
                <h2 className="text-2xl md:text-3xl font-bold">Best Sellers 🌟</h2>
              </div>
              <Link href="/shop?sort=popular" className="text-sm text-primary font-bold hover:underline shrink-0">View all →</Link>
            </motion.div>
            <motion.div
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4"
              variants={gridContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.1 }}
            >
              {bestSellers.map((p) => (
                <motion.div key={p.id} variants={gridItem}>
                  <ProductCard p={p} />
                </motion.div>
              ))}
            </motion.div>
          </section>
        )}


        {/* ── TESTIMONIALS ── */}
        <section className="container pb-10 md:pb-14">
          <motion.div
            className="text-center mb-6 md:mb-8"
            variants={sectionHeading}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
          >
            <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-0.5 md:mb-1">Happy customers</p>
            <h2 className="text-2xl md:text-3xl font-bold">What people are saying 💬</h2>
          </motion.div>

          {/* ── Auto-scrolling marquee, right → left, looping ── */}
          {reviewsLoading ? (
            <div className="flex gap-4 md:gap-5 overflow-hidden">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-44 w-72 shrink-0 rounded-3xl" />
              ))}
            </div>
          ) : (
            <div
              className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]"
              onMouseEnter={() => setMarqueePaused(true)}
              onMouseLeave={() => setMarqueePaused(false)}
            >
              <div
                className={cn("flex w-max gap-4 md:gap-5", !prefersReducedMotion && "animate-marquee")}
                style={marqueePaused ? { animationPlayState: "paused" } : undefined}
              >
                {[...reviews, ...reviews].map((t, i) => (
                  <div
                    key={`${t.id}-${i}`}
                    className="w-72 md:w-80 shrink-0 rounded-3xl bg-card border border-border/60 p-6 flex flex-col gap-3"
                  >
                    <div className="flex gap-0.5 text-amber-400 text-sm">{"★".repeat(t.rating)}</div>
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
                ))}
              </div>
            </div>
          )}

          {/* ── Leave a review CTA ── */}
          <div className="flex justify-center mt-7 md:mt-9">
            <Button
              variant="outline"
              onClick={() => setWriteReviewOpen(true)}
              className="rounded-full gap-2 border-border hover:border-primary/50 hover:text-primary"
            >
              <Star className="h-4 w-4" /> Leave a review
            </Button>
          </div>
        </section>

      </main>
      <Footer />
      <WriteReviewSheet open={writeReviewOpen} onOpenChange={setWriteReviewOpen} />
    </div>
  );
}
