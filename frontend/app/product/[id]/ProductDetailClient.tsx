"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";
import ProductCard from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ShoppingBag, Heart, Minus, Plus, Truck, Shield, ChevronRight, Share2, ImageOff,
} from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch, addToWishlist, removeFromWishlist, getWishlistIds } from "@/lib/api";
import type { Product, ProductSize } from "@/lib/types";
import { toast } from "sonner";

// ── Skeleton ──────────────────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="container py-8 space-y-8">
      <div className="flex gap-2">
        {[12, 16, 24].map((w) => <Skeleton key={w} className={`h-4 w-${w} rounded`} />)}
      </div>
      <div className="grid md:grid-cols-2 gap-10">
        <div className="space-y-3">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-16 rounded-lg" />)}
          </div>
        </div>
        <div className="space-y-4 pt-2">
          <Skeleton className="h-5 w-24 rounded" />
          <Skeleton className="h-10 w-3/4 rounded" />
          <Skeleton className="h-12 w-1/3 rounded" />
          <Skeleton className="h-px w-full" />
          <div className="flex gap-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-20 rounded-lg" />)}</div>
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProductDetailClient() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { add } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [inWishlist, setInWishlist] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setQty(1);
    setActiveImg(0);
    setSelectedColor("");
    setSelectedSize("");

    apiFetch(`/api/products/${id}`)
      .then(async (p: Product) => {
        setProduct(p);
        // Auto-select if only one option
        const colors = p.colors ?? [];
        if (colors.length === 1) setSelectedColor(colors[0]);
        const sizes = p.sizes ?? [];
        if (sizes.length === 1) setSelectedSize(sizes[0].label);

        // Track recently viewed in localStorage
        try {
          const key = "kcs_recently_viewed";
          const prev: string[] = JSON.parse(localStorage.getItem(key) || "[]");
          const updated = [p.id, ...prev.filter((x) => x !== p.id)].slice(0, 12);
          localStorage.setItem(key, JSON.stringify(updated));
        } catch {}

        const [rel, wids] = await Promise.allSettled([
          apiFetch(`/api/products?cat=${encodeURIComponent(p.category)}&limit=8`),
          user ? getWishlistIds() : Promise.resolve([]),
        ]);
        if (rel.status === "fulfilled") {
          const relProds: Product[] = (rel.value as any).products ?? rel.value;
          setRelated(relProds.filter((x) => x.id !== id).slice(0, 4));
        }
        if (wids.status === "fulfilled")
          setInWishlist((wids.value as string[]).includes(id));
      })
      .catch(() => router.push("/shop"))
      .finally(() => setLoading(false));
  }, [id, user]);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [product]);

  if (loading) return <div className="min-h-screen"><Navbar /><main><DetailSkeleton /></main></div>;
  if (!product) return null;

  // ── Derived state ───────────────────────────────────────────────────────────
  const allImages = product.images?.length > 0
    ? product.images
    : product.image_url ? [product.image_url] : [];

  const colors = product.colors ?? [];
  const hasColorChoice = colors.length > 1;
  const sizes: ProductSize[] = product.sizes ?? [];
  const tags = product.tags ?? [];

  const selectedSizeObj = sizes.find((sz) => sz.label === selectedSize);
  const effectiveStock = sizes.length > 0 ? (selectedSizeObj?.stock ?? 0) : product.stock;
  const maxQty = Math.min(effectiveStock, 10);

  const finalPrice = +(product.price * (1 - product.discount_percent / 100)).toFixed(2);
  const savings = +(product.price - finalPrice).toFixed(2);

  const canAdd =
    effectiveStock > 0 &&
    (colors.length === 0 || !hasColorChoice || !!selectedColor) &&
    (sizes.length === 0 || !!selectedSize);

  const stockInfo = (() => {
    if (sizes.length > 0 && !selectedSize)
      return { label: "Select a size to check stock", color: "text-muted-foreground", icon: "📏" };
    const s = effectiveStock;
    if (s === 0) return { label: "Out of stock", color: "text-destructive", icon: "⛔" };
    if (s <= 5) return { label: `Only ${s} left!`, color: "text-amber-600", icon: "⚠️" };
    return { label: "In stock", color: "text-green-600", icon: "✅" };
  })();

  // ── Actions ─────────────────────────────────────────────────────────────────
  const buildVariant = () => {
    const parts: string[] = [];
    if (selectedSize) parts.push(selectedSize);
    if (selectedColor) parts.push(selectedColor);
    const suffix = parts.join(", ");
    return {
      ...product,
      id: parts.length ? `${product.id}::${parts.join("::")}` : product.id,
      name: suffix ? `${product.name} – ${suffix}` : product.name,
    };
  };

  const handleAddToCart = () => {
    if (!canAdd) {
      if (sizes.length > 0 && !selectedSize) { toast.error("Please select a size"); return; }
      if (hasColorChoice && !selectedColor) { toast.error("Please choose a color"); return; }
      return;
    }
    const variant = buildVariant();
    for (let i = 0; i < qty; i++) add(variant);
    toast.success(`${qty > 1 ? `${qty}× ` : ""}${variant.name} added to cart`);
  };

  const handleBuyNow = () => { handleAddToCart(); if (canAdd) router.push("/cart"); };

  const toggleWishlist = async () => {
    if (!user) { toast.error("Sign in to save items"); router.push(`/auth?redirect=/product/${id}`); return; }
    setWishlistBusy(true);
    try {
      if (inWishlist) {
        await removeFromWishlist(product.id);
        setInWishlist(false);
        toast.success("Removed from wishlist");
      } else {
        await addToWishlist(product.id);
        setInWishlist(true);
        toast.success("Saved to wishlist ♡");
      }
    } catch (e: any) { toast.error(e.message); }
    setWishlistBusy(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* ── STICKY MINI PRODUCT BAR ── */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border shadow-sm transition-transform duration-300 ${
          stickyVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="container flex items-center gap-3 py-2.5">
          {/* Thumbnail */}
          <div className="h-11 w-11 rounded-lg overflow-hidden bg-muted border border-border flex-shrink-0">
            {allImages[0] ? (
              <img src={allImages[0]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted"><ImageOff className="h-6 w-6 text-muted-foreground/25" /></div>
            )}
          </div>

          {/* Name + price */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate leading-tight">{product.name}</p>
            <p className="text-sm text-primary font-extrabold">₹{finalPrice}</p>
          </div>

          {/* Add to cart */}
          <Button
            size="sm"
            onClick={handleAddToCart}
            disabled={!canAdd}
            className="flex-shrink-0 bg-primary text-primary-foreground h-9 px-4 text-xs font-bold"
          >
            <ShoppingBag className="h-3.5 w-3.5 mr-1.5" /> Add to cart
          </Button>
        </div>
      </div>

      <main className="container py-8 space-y-16">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <Link href="/shop" className="hover:text-foreground transition-colors">Shop</Link>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <Link href={`/shop/${product.category}`}
            className="hover:text-foreground transition-colors capitalize">
            {product.category.replace(/-/g, " ")}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{product.name}</span>
        </nav>

        {/* Main layout */}
        <div className="grid md:grid-cols-2 gap-10 lg:gap-16">

          {/* ── Left: Image gallery ────────────────────────────────────────── */}
          <div className="space-y-3">
            {/* Main image */}
            <div className="aspect-square rounded-2xl overflow-hidden bg-muted border border-border relative">
              {allImages[activeImg] ? (
                <img key={activeImg} src={allImages[activeImg]} alt={product.name}
                  className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full bg-muted"><ImageOff className="h-16 w-16 text-muted-foreground/20" /></div>
              )}
              {product.discount_percent > 0 && (
                <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground border-0">
                  -{product.discount_percent}% OFF
                </Badge>
              )}
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((url, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    className={`flex-shrink-0 h-16 w-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      i === activeImg ? "border-primary" : "border-transparent hover:border-border"
                    }`}>
                    <img src={url} alt={`View ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Right: Product info ───────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Category badge + name */}
            <div>
              <Link href={`/shop/${product.category}`}>
                <Badge variant="outline" className="mb-2 text-xs capitalize px-3 hover:bg-muted cursor-pointer">
                  {product.category.replace(/-/g, " ")}
                </Badge>
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold leading-tight">{product.name}</h1>
              {product.short_description && (
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {product.short_description}
                </p>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-4xl font-extrabold">₹{finalPrice}</span>
              {product.discount_percent > 0 && (
                <>
                  <span className="text-xl text-muted-foreground line-through">₹{product.price}</span>
                  <Badge className="bg-green-100 text-green-700 border-0 px-3 rounded-full">
                    You save ₹{savings}
                  </Badge>
                </>
              )}
            </div>

            {/* Stock status */}
            <p className={`text-sm font-semibold ${stockInfo.color}`}>
              {stockInfo.icon} {stockInfo.label}
            </p>

            <Separator />

            {/* Size selector */}
            {sizes.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">
                  Size{selectedSize ? <span className="font-normal text-muted-foreground">: {selectedSize}</span> : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((sz) => (
                    <button key={sz.label} onClick={() => { setSelectedSize(sz.label); setQty(1); }}
                      disabled={sz.stock === 0}
                      className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                        selectedSize === sz.label
                          ? "bg-primary text-primary-foreground border-primary"
                          : sz.stock === 0
                          ? "border-border text-muted-foreground line-through cursor-not-allowed opacity-50"
                          : "border-border hover:border-primary hover:bg-muted"
                      }`}>
                      {sz.label}
                      {sz.stock > 0 && sz.stock <= 5 && (
                        <span className="ml-1 text-[10px] text-amber-600 font-normal">({sz.stock})</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color selector */}
            {colors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">
                  Color{selectedColor ? <span className="font-normal text-muted-foreground">: {selectedColor}</span> : ""}
                </p>
                {hasColorChoice ? (
                  <Select value={selectedColor} onValueChange={setSelectedColor}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a color" />
                    </SelectTrigger>
                    <SelectContent>
                      {colors.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary" className="px-3 py-1 text-sm">{colors[0]}</Badge>
                )}
              </div>
            )}

            {/* Quantity */}
            {effectiveStock > 0 && (sizes.length === 0 || !!selectedSize) && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Quantity</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}
                    className="h-10 w-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-lg">{qty}</span>
                  <button onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty}
                    className="h-10 w-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40">
                    <Plus className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-muted-foreground">max {maxQty}</span>
                </div>
              </div>
            )}

            {/* CTA */}
            <div ref={ctaRef} className="flex gap-3">
              <Button size="lg" onClick={handleAddToCart} disabled={!canAdd}
                className="flex-1 bg-primary text-primary-foreground h-12 text-base">
                <ShoppingBag className="mr-2 h-5 w-5" /> Add to cart
              </Button>
              <button onClick={toggleWishlist} disabled={wishlistBusy}
                aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
                className={`h-12 w-12 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0 disabled:opacity-60 ${
                  inWishlist ? "border-primary bg-primary/10" : "border-border hover:border-primary hover:bg-muted"
                }`}>
                <Heart className={`h-5 w-5 ${inWishlist ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              </button>
            </div>

            {canAdd && (
              <Button variant="outline" size="lg" onClick={handleBuyNow}
                className="w-full h-12 text-base border-2">
                Buy now
              </Button>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((tag) => (
                  <Link key={tag} href={`/shop?tag=${encodeURIComponent(tag)}`}>
                    <Badge variant="secondary"
                      className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
                      #{tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}

            {/* Share */}
            <div className="flex items-center gap-2 pt-1">
              <Share2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">Share:</span>
              {[
                {
                  label: "WhatsApp",
                  href: `https://wa.me/?text=${encodeURIComponent(`Check out ${product.name} on Cotton Cloud Company! ${typeof window !== "undefined" ? window.location.href : ""}`)}`,
                  cls: "text-green-600 hover:bg-green-50",
                },
                {
                  label: "X / Twitter",
                  href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just found this adorable ${product.name} on @cottoncloudcompany 🌸`)}&url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`,
                  cls: "text-sky-600 hover:bg-sky-50",
                },
                {
                  label: "Copy link",
                  href: null,
                  cls: "text-muted-foreground hover:bg-muted",
                },
              ].map(({ label, href, cls }) => (
                <button
                  key={label}
                  onClick={() => {
                    if (href) { window.open(href, "_blank", "noopener,noreferrer"); }
                    else {
                      navigator.clipboard.writeText(window.location.href).then(() => toast.success("Link copied!"));
                    }
                  }}
                  className={`text-xs font-medium px-3 py-1 rounded-full border border-border transition-colors ${cls}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {[
                { icon: Truck, label: "Free shipping", sub: "orders over ₹1,499" },
                { icon: Shield, label: "Secure checkout", sub: "100% safe" },
              ].map(({ icon: I, label, sub }) => (
                <div key={label} className="flex flex-col items-center text-center p-3 rounded-lg bg-muted gap-1.5 border border-border">
                  <I className="h-5 w-5 text-primary" />
                  <p className="text-xs font-semibold leading-tight">{label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{sub}</p>
                </div>
              ))}
            </div>

            {/* Accordion */}
            <Accordion type="single" collapsible>
              {product.description && (
                <AccordionItem value="desc">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                    Description
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {product.description}
                  </AccordionContent>
                </AccordionItem>
              )}
              <AccordionItem value="details">
                <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                  Product details
                </AccordionTrigger>
                <AccordionContent>
                  <dl className="text-sm space-y-2">
                    {[
                      ["Category", product.category.replace(/-/g, " ")],
                      ["SKU", product.sku ?? "—"],
                      ["Stock", sizes.length > 0 ? `${product.stock} total units` : `${product.stock} units`],
                      ...(sizes.length > 0 ? sizes.map((sz) => [`Stock – ${sz.label}`, `${sz.stock} units`]) : []),
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between py-1 border-b border-border/40 last:border-0">
                        <dt className="text-muted-foreground capitalize">{k}</dt>
                        <dd className={`font-medium ${k === "SKU" ? "font-mono text-xs" : "capitalize"}`}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="shipping">
                <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                  Shipping information
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground space-y-2">
                  <p>📦 Orders dispatched within 1–3 business days.</p>
                  <p>🚚 Standard delivery: 3–7 business days across India.</p>
                  <p>🎉 Free shipping on orders above ₹1,499.</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-end justify-between">
              <h2 className="text-2xl font-bold">You might also love</h2>
              <Link href={`/shop/${product.category}`}
                className="text-sm text-primary font-medium hover:underline">
                See all →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
