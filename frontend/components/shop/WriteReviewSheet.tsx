"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, Search, PackageSearch } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, searchSuggestions } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type PickedProduct = { id: string; name: string; image_url: string | null };

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star className={cn(
            "h-7 w-7 transition-colors",
            n <= (hovered || value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
          )} />
        </button>
      ))}
    </div>
  );
}

export default function WriteReviewSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user } = useAuth();

  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<PickedProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [product, setProduct] = useState<PickedProduct | null>(null);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [guestName, setGuestName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!productQuery.trim()) { setProductResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      searchSuggestions(productQuery, 8)
        .then((results) => setProductResults(results.map((p) => ({ id: p.id, name: p.name, image_url: p.image_url }))))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [productQuery]);

  const reset = () => {
    setProductQuery(""); setProductResults([]); setProduct(null);
    setRating(5); setTitle(""); setBody(""); setGuestName("");
  };

  const submit = async () => {
    if (!product) { toast.error("Search and pick the product you're reviewing"); return; }
    if (!user && !guestName.trim()) { toast.error("Add your name so we know who to thank!"); return; }
    setSubmitting(true);
    try {
      await apiFetch("/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          product_id: product.id,
          rating,
          title: title.trim(),
          body: body.trim(),
          guest_name: user ? undefined : guestName.trim(),
        }),
      });
      toast.success("Thanks! Your review is awaiting a quick approval 🌸");
      onOpenChange(false);
      reset();
    } catch (e: any) {
      toast.error(e.message || "Could not submit your review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onOpenChange(false); }}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle>Write a review</DialogTitle>
          <DialogDescription>Tell other cotton-cloud fans what you thought — it goes live after a quick check.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-1">
            <Label>Which product?</Label>
            {product ? (
              <div className="flex items-center gap-2.5 border border-border rounded-lg p-2.5">
                <div className="h-10 w-10 rounded-md bg-muted overflow-hidden border border-border shrink-0">
                  {product.image_url
                    ? <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                    : <div className="h-full w-full flex items-center justify-center text-muted-foreground/30 text-xs">?</div>}
                </div>
                <p className="text-sm font-medium flex-1 truncate">{product.name}</p>
                <Button size="sm" variant="ghost" onClick={() => setProduct(null)}>Change</Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    placeholder="Search the product you bought…"
                    className="pl-9"
                  />
                </div>
                {searching && <p className="text-xs text-muted-foreground">Searching…</p>}
                {productResults.length > 0 && (
                  <div className="border border-border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                    {productResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setProduct(p); setProductQuery(""); setProductResults([]); }}
                        className="w-full flex items-center gap-2.5 p-2 hover:bg-muted/60 transition-colors text-left"
                      >
                        <div className="h-8 w-8 rounded-md bg-muted overflow-hidden border border-border shrink-0">
                          {p.image_url
                            ? <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                            : <div className="h-full w-full flex items-center justify-center text-muted-foreground/30 text-xs">?</div>}
                        </div>
                        <span className="text-sm truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {!searching && productQuery.trim() && productResults.length === 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <PackageSearch className="h-3.5 w-3.5" /> No products found
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label>Your rating</Label>
            <StarPicker value={rating} onChange={setRating} />
          </div>

          {!user && (
            <div className="space-y-1">
              <Label>Your name</Label>
              <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Anushka Sharma" maxLength={80} />
            </div>
          )}

          <div className="space-y-1">
            <Label>Title <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Absolutely adorable!" />
          </div>

          <div className="space-y-1">
            <Label>Your review</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={2000}
              placeholder="What did you love about it?" />
            <p className="text-xs text-muted-foreground text-right">{body.length}/2000</p>
          </div>

          <Button className="w-full bg-gradient-primary text-primary-foreground border-0" onClick={submit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
