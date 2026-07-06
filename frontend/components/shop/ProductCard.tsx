"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingBag, ImageOff, ChevronLeft, ChevronRight } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { addToWishlist, removeFromWishlist, getWishlistIds } from "@/lib/api";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type { Product } from "@/lib/types";
import type { Product } from "@/lib/types";

export default function ProductCard({ p }: { p: Product }) {
  const { add } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const final = +(p.price * (1 - p.discount_percent / 100)).toFixed(2);
  const colors = p.colors ?? [];
  const hasChoices = colors.length > 1;
  const [selected, setSelected] = useState<string>(hasChoices ? "" : colors[0]?.label ?? "");
  const [inWishlist, setInWishlist] = useState(false);
  const images = p.images?.length ? p.images : p.image_url ? [p.image_url] : [];
  const [imgIndex, setImgIndex] = useState(0);
  const touchStartX = useRef(0);

  const showImage = (i: number, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setImgIndex((i + images.length) % images.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) showImage(imgIndex + (delta < 0 ? 1 : -1));
  };

  useEffect(() => {
    if (!user) { setInWishlist(false); return; }
    getWishlistIds()
      .then((ids) => setInWishlist(ids.includes(p.id)))
      .catch(() => {});
  }, [user, p.id]);

  // Switch to the color's linked image, if it has one
  useEffect(() => {
    if (!selected) return;
    const colorImages = colors.find((c) => c.label === selected)?.images;
    if (!colorImages?.length) return;
    const idx = images.indexOf(colorImages[0]);
    if (idx !== -1) setImgIndex(idx);
  }, [selected]);

  const handleAdd = () => {
    if (!user) {
      toast.error("Please sign in to add items to cart");
      router.push(`/auth?redirect=${encodeURIComponent("/cart")}`);
      return;
    }
    if (hasChoices && !selected) { toast.error("Please choose a color first"); return; }
    const selectedColorObj = colors.find((c) => c.label === selected);
    if (selectedColorObj && selectedColorObj.stock === 0) { toast.error("This color is out of stock"); return; }
    const variant = selected ? { ...p, id: `${p.id}::${selected}`, name: `${p.name} – ${selected}` } : p;
    add(variant);
    toast.success(`Added to cart`);
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast.error("Sign in to save items"); return; }
    try {
      if (inWishlist) {
        await removeFromWishlist(p.id);
        setInWishlist(false);
        toast.success("Removed from wishlist");
      } else {
        await addToWishlist(p.id);
        setInWishlist(true);
        toast.success("Saved to wishlist ♡");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    }
  };

  const productHref = `/product/${p.slug ?? p.id}`;

  return (
    <Card className="group overflow-hidden border border-border/60 bg-card rounded-3xl h-full flex flex-col">
      {/* ── Clickable image → product page ── */}
      <Link
        href={productHref}
        className="block relative aspect-square bg-gradient-hero overflow-hidden"
        onTouchStart={images.length > 1 ? handleTouchStart : undefined}
        onTouchEnd={images.length > 1 ? handleTouchEnd : undefined}
      >
        {images.length > 0 ? (
          <img
            src={images[imgIndex]}
            alt={p.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-bounce"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-muted">
            <ImageOff className="h-10 w-10 text-muted-foreground/25" />
          </div>
        )}

        {images.length > 1 && (
          <>
            <button
              onClick={(e) => showImage(imgIndex - 1, e)}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-background/80 hidden md:grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
            >
              <ChevronLeft className="h-4 w-4 text-foreground" />
            </button>
            <button
              onClick={(e) => showImage(imgIndex + 1, e)}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-background/80 hidden md:grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
            >
              <ChevronRight className="h-4 w-4 text-foreground" />
            </button>

            <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1.5 z-10">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => showImage(i, e)}
                  aria-label={`Show image ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === imgIndex ? "w-4 bg-background" : "w-1.5 bg-background/60"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {p.discount_percent > 0 && (
          <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground border-0">
            -{p.discount_percent}%
          </Badge>
        )}
        <button
          onClick={handleWishlist}
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute top-3 right-3 h-9 w-9 rounded-full backdrop-blur grid place-items-center transition-bounce ${
            inWishlist
              ? "bg-primary/20 border border-primary/40"
              : "bg-background/80 hover:bg-background"
          }`}
        >
          <Heart className={`h-4 w-4 ${inWishlist ? "fill-primary text-primary" : "text-primary"}`} />
        </button>
      </Link>

      {/* ── Info + actions (no Link wrapper — stays on card) ── */}
      <div className="p-4 space-y-2 flex-1 flex flex-col">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{p.category.replace("-", " ")}</p>
        <Link href={productHref} className="block hover:underline underline-offset-2">
          <h3 className="font-semibold leading-tight line-clamp-1">{p.name}</h3>
        </Link>
        {p.short_description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{p.short_description}</p>
        )}
        <div className="flex items-baseline gap-2 pt-1 flex-1 items-end">
          <span className="text-lg font-bold text-foreground">₹{final}</span>
          {p.discount_percent > 0 && (
            <span className="text-sm text-muted-foreground line-through">₹{p.price}</span>
          )}
          {p.stock === 0 && (
            <Badge variant="outline" className="ml-auto">Sold out</Badge>
          )}
        </div>

        {/* Color picker — isolated, never triggers navigation */}
        {hasChoices && (
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-full rounded-full mt-1">
              <SelectValue placeholder="Choose a color" />
            </SelectTrigger>
            <SelectContent>
              {colors.map((c) => (
                <SelectItem key={c.label} value={c.label} disabled={c.stock === 0}>
                  {c.label}{c.stock === 0 ? " (Out of stock)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          size="sm"
          disabled={p.stock === 0}
          onClick={handleAdd}
          className="w-full mt-2 rounded-full bg-gradient-primary text-primary-foreground border-0"
        >
          <ShoppingBag className="mr-2 h-4 w-4" /> Add to cart
        </Button>
      </div>
    </Card>
  );
}
