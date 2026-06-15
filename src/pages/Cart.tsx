import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/shop/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/useCart";
import { Trash2 } from "lucide-react";

export default function Cart() {
  const { items, setQty, remove, total, clear } = useCart();
  const nav = useNavigate();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-8 space-y-6 max-w-3xl">
        <h1 className="text-4xl font-bold">Your cart</h1>
        {items.length === 0 ? (
          <div className="text-center py-20 rounded-3xl bg-card shadow-soft">
            <div className="text-6xl mb-3">🛍️</div>
            <p className="text-muted-foreground mb-4">Your cart is empty</p>
            <Link to="/shop"><Button className="rounded-full bg-gradient-primary text-primary-foreground border-0">Start shopping</Button></Link>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {items.map(({ product: p, qty }) => {
                const final = +(p.price * (1 - p.discount_percent / 100)).toFixed(2);
                return (
                  <div key={p.id} className="flex items-center gap-4 p-4 rounded-3xl bg-card shadow-soft">
                    <div className="h-20 w-20 rounded-2xl overflow-hidden bg-gradient-hero shrink-0">
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                        : <div className="h-full w-full grid place-items-center text-3xl">🌸</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{p.name}</p>
                      <p className="text-sm text-muted-foreground">₹{final} each</p>
                    </div>
                    <Input type="number" min={1} value={qty}
                      onChange={(e) => setQty(p.id, parseInt(e.target.value) || 0)}
                      className="w-20 rounded-full" />
                    <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
            <div className="p-5 rounded-3xl bg-card shadow-soft flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">₹{total}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-full" onClick={clear}>Clear</Button>
                <Button className="rounded-full bg-gradient-primary text-primary-foreground border-0"
                  onClick={() => nav("/shop")}>Continue shopping</Button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}