"use client";

import Footer from "@/components/shop/Footer";
import Navbar from "@/components/shop/Navbar";
import ProductCard from "@/components/shop/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import type { Category, Product } from "@/lib/types";
import { Cloud, ShoppingBag, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";

const hero = "/hero.jpg";

const FALLBACK_REVIEWS = [
  { id: "f1", name: "Aanya S.", location: "Mumbai", avatar: "🌸", rating: 5, text: "The stationery set I ordered was absolutely adorable! Great packaging and super fast delivery. Will definitely be ordering again!" },
  { id: "f2", name: "Rhea M.",  location: "Bangalore", avatar: "🎀", rating: 5, text: "Bought return gifts for my daughter's birthday party — every single kid was obsessed. The quality exceeded my expectations!" },
  { id: "f3", name: "Priya K.", location: "Delhi",     avatar: "🌈", rating: 5, text: "Cotton Cloud has the cutest things ever! The kawaii lamp is now my desk's star. Highly recommend to anyone who loves cute decor." },
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
  const [activeReview, setActiveReview] = useState(0);
  const [reviewDirection, setReviewDirection] = useState(1);
  const touchStartX = useRef<number | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const goToReview = (i: number) => {
    setReviewDirection(i > activeReview ? 1 : -1);
    setActiveReview(i);
  };

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

        // Shuffle both sets
        const shuffledNewest = shuffle(newest);
        const shuffledPopular = shuffle(popular);

        // Pick 8 for new arrivals
        const arrivals = shuffledNewest.slice(0, 8);

        // For best sellers, remove any products already in arrivals, then pick 8
        const arrivalIds = new Set(arrivals.map((p) => p.id));
        const filteredPopular = shuffledPopular.filter((p) => !arrivalIds.has(p.id));

        // If not enough unique popular products, fill from remaining newest
        const remainingNewest = shuffledNewest.filter(
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
        Free shipping on orders over ₹1,499 &nbsp;·&nbsp; New arrivals every week{" "}
        <motion.span
          className="inline-block"
          {...(!prefersReducedMotion && {
            animate: { rotate: [0, 12, -12, 0] },
            transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
          })}
        >
          🌸
        </motion.span>
      </motion.div>

      <Navbar />

      <main>

        {/* ── HERO ── */}
        <section className="relative overflow-hidden">
          <div className="container grid md:grid-cols-2 gap-6 md:gap-8 items-center py-8 md:py-20">
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
              className="relative mt-4 md:mt-0"
              initial={{ opacity: 0, scale: 0.92, rotate: -3 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }}
            >
              <div className="absolute -inset-4 bg-gradient-primary opacity-20 blur-3xl rounded-full" />
              <motion.img
                src={hero} alt="Kawaii stationery flat lay" width={1536} height={896}
                className="relative rounded-[2rem] shadow-cute w-full h-auto"
                {...(!prefersReducedMotion && {
                  animate: { y: [0, -10, 0] },
                  transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                })}
              />
              <motion.span
                className="absolute -top-3 -left-3 md:-top-4 md:-left-4 text-2xl md:text-3xl select-none"
                {...(!prefersReducedMotion && {
                  animate: { y: [0, -8, 0], rotate: [0, 10, 0] },
                  transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                })}
              >
                ✨
              </motion.span>
              <motion.span
                className="absolute -bottom-2 -right-2 md:-bottom-3 md:-right-3 text-xl md:text-2xl select-none"
                {...(!prefersReducedMotion && {
                  animate: { y: [0, 8, 0], rotate: [0, -10, 0] },
                  transition: { duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
                })}
              >
                🌸
              </motion.span>
            </motion.div>
          </div>
        </section>


        {/* ── CATEGORY SCROLL ── */}
        <section className="bg-card border-y border-border py-4 md:py-5">
          <div className="container">
            <motion.div
              className="flex gap-4 md:gap-5 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1"
              variants={gridContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
            >
              {categoriesLoading ? (
                Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 flex flex-col items-center gap-1.5 w-[64px] md:w-[88px]">
                    <Skeleton className="h-14 w-14 md:h-20 md:w-20 rounded-full" />
                    <Skeleton className="h-2.5 w-10 rounded" />
                  </div>
                ))
              ) : (
                <>
              {categories.map((c) => (
                <motion.div key={c.slug} variants={gridItem} className="flex-shrink-0" whileHover={{ y: -4 }}>
                  <Link
                    href={`/shop/${c.slug}`}
                    className="group flex flex-col items-center gap-1.5 w-[64px] md:w-[88px]"
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
                </motion.div>
              ))}
              <motion.div variants={gridItem} className="flex-shrink-0" whileHover={{ y: -4 }}>
                <Link
                  href="/shop"
                  className="group flex flex-col items-center gap-1.5 w-[64px] md:w-[88px]"
                >
                  <div className="h-14 w-14 md:h-20 md:w-20 grid place-items-center rounded-full bg-gradient-primary text-primary-foreground group-hover:scale-110 transition-bounce">
                    <ShoppingBag className="h-6 w-6 md:h-7 md:w-7" />
                  </div>
                  <p className="text-[10px] md:text-xs font-semibold text-center text-primary">View all</p>
                </Link>
              </motion.div>
                </>
              )}
            </motion.div>
          </div>
        </section>

        {/* ── PROMO BANNERS ── */}
        <motion.section
          className="container py-5 md:py-8"
          variants={gridContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
        >
          <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4">

            <motion.div variants={gridItem} whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
              <Link
                href="/shop?sort=newest"
                className="group relative overflow-hidden rounded-2xl md:rounded-3xl min-h-[130px] md:min-h-[200px] flex items-end p-4 md:p-7 border border-border/60 shadow-sm hover:shadow-lg transition-shadow"
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
            </motion.div>

            <motion.div variants={gridItem} whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
              <Link
                href="/shop?sort=popular"
                className="group relative overflow-hidden rounded-2xl md:rounded-3xl min-h-[130px] md:min-h-[200px] flex items-end p-4 md:p-7 border border-border/60 shadow-sm hover:shadow-lg transition-shadow"
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
            </motion.div>
          </div>
        </motion.section>

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

          {/* ── Desktop: 3-column grid ── */}
          <motion.div
            className="hidden md:grid md:grid-cols-3 gap-5"
            variants={gridContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            {reviewsLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 rounded-3xl" />
                ))
              : reviews.map((t) => (
                  <motion.div
                    key={t.id}
                    variants={gridItem}
                    whileHover={{ y: -4 }}
                    className="relative rounded-3xl bg-card border border-border/60 p-6 flex flex-col gap-3"
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
                  </motion.div>
                ))
            }
          </motion.div>

          {/* ── Mobile: Swipe carousel ── */}
          <div className="md:hidden">
            {reviewsLoading ? (
              <Skeleton className="h-52 rounded-2xl" />
            ) : (
              <>
                {/* Carousel track */}
                <div
                  className="overflow-hidden rounded-2xl"
                  onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                  onTouchEnd={(e) => {
                    if (touchStartX.current === null) return;
                    const dx = e.changedTouches[0].clientX - touchStartX.current;
                    if (dx < -40) { setReviewDirection(1); setActiveReview((p) => Math.min(p + 1, reviews.length - 1)); }
                    if (dx > 40)  { setReviewDirection(-1); setActiveReview((p) => Math.max(p - 1, 0)); }
                    touchStartX.current = null;
                  }}
                >
                  <AnimatePresence mode="wait" custom={reviewDirection} initial={false}>
                    <motion.div
                      key={activeReview}
                      custom={reviewDirection}
                      initial={{ opacity: 0, x: reviewDirection > 0 ? 48 : -48 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: reviewDirection > 0 ? -48 : 48 }}
                      transition={{ duration: 0.28, ease: "easeOut" }}
                      className="rounded-2xl bg-card border border-border/60 p-5 flex flex-col gap-3"
                    >
                      <div className="flex gap-0.5 text-amber-400 text-base">{"★".repeat(reviews[activeReview].rating)}</div>
                      <p className="text-sm text-foreground/80 leading-relaxed flex-1">"{reviews[activeReview].text}"</p>
                      <div className="flex items-center gap-3 pt-1 border-t border-border/40">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 border border-border/40 grid place-items-center text-xl flex-shrink-0">
                          {reviews[activeReview].avatar}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground leading-none">{reviews[activeReview].name}</p>
                          {reviews[activeReview].location && <p className="text-xs text-muted-foreground mt-0.5">{reviews[activeReview].location}</p>}
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Controls row */}
                <div className="flex items-center justify-between mt-4 px-1">
                  {/* Prev button */}
                  <button
                    onClick={() => { setReviewDirection(-1); setActiveReview((p) => Math.max(p - 1, 0)); }}
                    disabled={activeReview === 0}
                    aria-label="Previous review"
                    className="h-9 w-9 rounded-full flex items-center justify-center border border-border/60 bg-card text-foreground disabled:opacity-30 transition-colors hover:bg-accent active:scale-95"
                  >
                    ‹
                  </button>

                  {/* Dot indicators */}
                  <div className="flex gap-2">
                    {reviews.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => goToReview(i)}
                        aria-label={`Go to review ${i + 1}`}
                        className={`rounded-full transition-all duration-200 ${
                          i === activeReview
                            ? "w-5 h-2.5 bg-primary"
                            : "w-2.5 h-2.5 bg-border hover:bg-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Next button */}
                  <button
                    onClick={() => { setReviewDirection(1); setActiveReview((p) => Math.min(p + 1, reviews.length - 1)); }}
                    disabled={activeReview === reviews.length - 1}
                    aria-label="Next review"
                    className="h-9 w-9 rounded-full flex items-center justify-center border border-border/60 bg-card text-foreground disabled:opacity-30 transition-colors hover:bg-accent active:scale-95"
                  >
                    ›
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
