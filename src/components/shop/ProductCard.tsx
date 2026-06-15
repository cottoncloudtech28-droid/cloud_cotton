import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  discount_percent: number;
  image_url: string | null;
  category: string;
  stock: number;
  colors?: string[] | null;
}

export default function ProductCard({ p }: { p: Product }) {
  const { add } = useCart();
  const final = +(p.price * (1 - p.discount_percent / 100)).toFixed(2);
  const colors = p.colors ?? [];
  const hasChoices = colors.length > 1;
  const [selected, setSelected] = useState<string>(hasChoices ? "" : colors[0] ?? "");

  const handleAdd = () => {
    if (hasChoices && !selected) {
      toast.error("Please choose a color first");
      return;
    }
    const variant = selected
      ? { ...p, id: `${p.id}::${selected}`, name: `${p.name} – ${selected}` }
      : p;
    add(variant);
    toast.success(`Added ${variant.name} to cart`);
  };

  return (
    <Card className="group overflow-hidden border-border/60 bg-card shadow-soft hover:shadow-cute transition-bounce hover:-translate-y-1 rounded-3xl">
      <div className="aspect-square bg-gradient-hero relative overflow-hidden">
        {p.image_url ? (
          <img src={p.image_url} alt={p.name} loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-bounce" />
        ) : (
          <div className="flex items-center justify-center h-full text-6xl">🌸</div>
        )}
        {p.discount_percent > 0 && (
          <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground border-0">
            -{p.discount_percent}%
          </Badge>
        )}
        <button className="absolute top-3 right-3 h-9 w-9 rounded-full bg-background/80 backdrop-blur grid place-items-center hover:bg-background transition-bounce">
          <Heart className="h-4 w-4 text-primary" />
        </button>
      </div>
      <div className="p-4 space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{p.category}</p>
        <h3 className="font-semibold leading-tight line-clamp-1">{p.name}</h3>
        {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
        <div className="flex items-baseline gap-2 pt-1">
          <span className="text-lg font-bold text-foreground">₹{final}</span>
          {p.discount_percent > 0 && (
            <span className="text-sm text-muted-foreground line-through">₹{p.price}</span>
          )}
          {p.stock === 0 && <Badge variant="outline" className="ml-auto">Sold out</Badge>}
        </div>
        {hasChoices && (
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-full rounded-full mt-1">
              <SelectValue placeholder="Choose a color" />
            </SelectTrigger>
            <SelectContent>
              {colors.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
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
