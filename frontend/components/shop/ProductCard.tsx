"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingBag, ImageOff } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { addToWishlist, removeFromWishlist, getWishlistIds } from "@/lib/api";
import { toast } from "sonner";
import { useEffect, useState } from "react";
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
  const final = +(p.price * (1 - p.discount_percent / 100)).toFixed(2);
  const colors = p.colors ?? [];
  const hasChoices = colors.length > 1;
  const [selected, setSelected] = useState<string>(hasChoices ? "" : colors[0] ?? "");
  const [inWishlist, setInWishlist] = useState(false);

  useEffect(() => {
    if (!user) { setInWishlist(false); return; }
    getWishlistIds()
      .then((ids) => setInWishlist(ids.includes(p.id)))
      .catch(() => {});
  }, [user, p.id]);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasChoices && !selected) { toast.error("Please choose a color first"); return; }
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

  return (
    <Link href={`/product/${p.slug ?? p.id}`} className="block group">
      <Card className="overflow-hidden border border-border/60 bg-card rounded-3xl h-full flex flex-col">
        <div className="aspect-square bg-gradient-hero relative overflow-hidden">
          {p.image_url ? (
            <img
              src={p.image_url}
              alt={p.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-bounce"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-muted"><ImageOff className="h-10 w-10 text-muted-foreground/25" /></div>
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
        </div>
        <div className="p-4 space-y-2 flex-1 flex flex-col">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{p.category.replace("-", " ")}</p>
          <h3 className="font-semibold leading-tight line-clamp-1 flex-1">{p.name}</h3>
          {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-lg font-bold text-foreground">₹{final}</span>
            {p.discount_percent > 0 && (
              <span className="text-sm text-muted-foreground line-through">₹{p.price}</span>
            )}
            {p.stock === 0 && (
              <Badge variant="outline" className="ml-auto">Sold out</Badge>
            )}
          </div>
          {hasChoices && (
            <Select
              value={selected}
              onValueChange={setSelected}
            >
              <SelectTrigger
                className="w-full rounded-full mt-1"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              >
                <SelectValue placeholder="Choose a color" />
              </SelectTrigger>
              <SelectContent>
                {colors.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
    </Link>
  );
}
