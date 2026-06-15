"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Product } from "@/lib/types";

export interface CartItem { product: Product; qty: number; }

interface CartCtx {
  items: CartItem[];
  add: (p: Product, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  total: number;
}

const Ctx = createContext<CartCtx | null>(null);
const KEY = "ccc_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(items)); }, [items]);

  const add = (p: Product, qty = 1) => setItems((cur) => {
    const i = cur.findIndex((x) => x.product.id === p.id);
    if (i >= 0) { const next = [...cur]; next[i] = { ...next[i], qty: next[i].qty + qty }; return next; }
    return [...cur, { product: p, qty }];
  });
  const remove = (id: string) => setItems((cur) => cur.filter((x) => x.product.id !== id));
  const setQty = (id: string, qty: number) => setItems((cur) =>
    qty <= 0 ? cur.filter((x) => x.product.id !== id)
      : cur.map((x) => x.product.id === id ? { ...x, qty } : x));
  const clear = () => setItems([]);

  const count = items.reduce((s, x) => s + x.qty, 0);
  const total = +items.reduce((s, x) => s + x.qty * x.product.price * (1 - x.product.discount_percent / 100), 0).toFixed(2);

  return <Ctx.Provider value={{ items, add, remove, setQty, clear, count, total }}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
