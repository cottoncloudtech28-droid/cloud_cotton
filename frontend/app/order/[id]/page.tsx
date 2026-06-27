"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrderInvoice } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Order } from "@/lib/types";
import {
  CheckCircle2, Package, MapPin, Truck, FileText, ShoppingBag,
  ImageOff, CreditCard, Banknote, XCircle,
} from "lucide-react";

const TIMELINE_STEPS = [
  { key: "pending",   label: "Ordered" },
  { key: "confirmed", label: "Confirmed" },
  { key: "shipped",   label: "Shipped" },
  { key: "delivered", label: "Delivered" },
] as const;

const STEP_INDEX: Record<string, number> = {
  pending: 0, confirmed: 1, shipped: 2, delivered: 3, cancelled: -1,
};

export default function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/auth"); return; }
    getOrderInvoice(id)
      .then(({ order: o }) => setOrder(o))
      .catch((e) => setError(e.message || "Order not found"))
      .finally(() => setLoading(false));
  }, [id, user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container py-12 space-y-5" style={{ maxWidth: 640, marginLeft: "auto", marginRight: "auto" }}>
          <Skeleton className="h-56 rounded-3xl" />
          <Skeleton className="h-28 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-36 rounded-3xl" />
            <Skeleton className="h-36 rounded-3xl" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-20">
          <div className="text-center space-y-4 max-w-sm mx-auto px-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-red-100 grid place-items-center">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <p className="font-semibold text-lg">{error || "Order not found"}</p>
            <p className="text-sm text-muted-foreground">We couldn't load this order. It may not exist or you may not have access.</p>
            <Button variant="outline" className="rounded-full" onClick={() => router.push("/profile")}>
              View my orders
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isPaid = order.payment_method === "razorpay";
  const currentStep = STEP_INDEX[order.status] ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Navbar />
      <main className="flex-1 container py-10 space-y-5" style={{ maxWidth: 640, marginLeft: "auto", marginRight: "auto" }}>

        {/* ── Hero card ── */}
        <div className="rounded-3xl bg-card border border-green-200/60 p-8 text-center space-y-4">
          <div className="relative mx-auto h-20 w-20">
            <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-30" />
            <div className="relative h-20 w-20 rounded-full bg-green-100 grid place-items-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              {isPaid ? "Payment successful! 🎉" : "Order placed! 🎉"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">
              {isPaid
                ? "Your payment was processed successfully and your order is confirmed."
                : "Your order is confirmed. You'll pay when it arrives!"}
            </p>
          </div>
          <div className="inline-block bg-muted/70 rounded-2xl px-6 py-3">
            <p className="text-xs text-muted-foreground mb-0.5">Order ID</p>
            <p className="font-mono font-bold text-lg tracking-wide">#{order.orderId}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(order.createdAt).toLocaleDateString("en-IN", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        </div>

        {/* ── Status timeline ── */}
        {order.status !== "cancelled" && (
          <div className="rounded-3xl bg-card border border-border/60 px-6 py-5 space-y-4">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Order status
            </h2>
            <div className="flex items-start">
              {TIMELINE_STEPS.map((step, i) => {
                const done = currentStep >= STEP_INDEX[step.key];
                const active = currentStep === STEP_INDEX[step.key];
                return (
                  <div key={step.key} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all ${
                        done ? "bg-primary border-primary shadow-sm" : "bg-background border-border"
                      }`}>
                        {done
                          ? <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                          : <span className="h-2 w-2 rounded-full bg-border" />}
                      </div>
                      <span className={`text-[10px] font-semibold whitespace-nowrap ${
                        active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"
                      }`}>{step.label}</span>
                    </div>
                    {i < TIMELINE_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mb-5 mx-1 rounded-full transition-all ${
                        currentStep > STEP_INDEX[step.key] ? "bg-primary" : "bg-border"
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
            {order.trackingNumber && (
              <div className="bg-purple-50/60 border border-purple-100 rounded-2xl px-4 py-2.5 flex items-center gap-2">
                <Truck className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <p className="text-xs text-purple-800">
                  Tracking: <span className="font-mono font-semibold">{order.trackingNumber}</span>
                </p>
                <Link href={`/track-order?id=${order.orderId}`} className="ml-auto text-xs text-purple-600 underline underline-offset-2">
                  Track
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── Items ordered ── */}
        <div className="rounded-3xl bg-card border border-border/60 p-5 space-y-3">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" />
            {order.items.length} item{order.items.length !== 1 ? "s" : ""} ordered
          </h2>
          <div className="divide-y divide-border/40">
            {order.items.map((item, i) => {
              const final = +(item.price * (1 - item.discount_percent / 100)).toFixed(2);
              return (
                <div key={i} className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
                  <div className="h-14 w-14 rounded-xl overflow-hidden bg-muted shrink-0">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      : <div className="h-full w-full flex items-center justify-center"><ImageOff className="h-5 w-5 text-muted-foreground/30" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    {(item.color || item.size) && (
                      <p className="text-xs text-muted-foreground mt-0.5">{[item.color, item.size].filter(Boolean).join(" / ")}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">Qty {item.qty} × ₹{final}</p>
                  </div>
                  <p className="font-bold text-sm shrink-0">₹{(final * item.qty).toFixed(2)}</p>
                </div>
              );
            })}
          </div>
          <div className="border-t border-border/60 pt-3 space-y-1.5 text-sm">
            {(order.shipping_charge ?? 0) > 0 ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>₹{order.shipping_charge}</span>
              </div>
            ) : (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-green-600 font-medium">FREE</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-base pt-0.5">
              <span>Total {isPaid ? "paid" : "on delivery"}</span>
              <span>₹{order.total}</span>
            </div>
          </div>
        </div>

        {/* ── Delivery + Payment ── */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-3xl bg-card border border-border/60 p-5 space-y-2">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Delivery to
            </h2>
            <p className="font-semibold text-sm">{order.address.fullName}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ""}
              <br />{order.address.city}, {order.address.state}
              <br />PIN {order.address.pincode}
            </p>
            <p className="text-sm text-muted-foreground">{order.address.phone}</p>
          </div>

          <div className="rounded-3xl bg-card border border-border/60 p-5 space-y-2.5">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> Payment
            </h2>
            {isPaid ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Razorpay</span>
                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">PAID</span>
                </div>
                {order.razorpay_payment_id && (
                  <p className="text-[11px] font-mono text-muted-foreground break-all leading-relaxed">
                    Txn: {order.razorpay_payment_id}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-semibold">Cash on Delivery</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Keep ₹{order.total} ready to pay the delivery partner.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── CTAs ── */}
        <div className="grid sm:grid-cols-3 gap-3">
          <Link href={`/track-order?id=${order.orderId}`}>
            <Button variant="outline" className="w-full rounded-2xl h-12 gap-2 border-border hover:border-primary/50 hover:text-primary">
              <Truck className="h-4 w-4" /> Track order
            </Button>
          </Link>
          <Link href={`/invoice/${order.id}`} target="_blank">
            <Button variant="outline" className="w-full rounded-2xl h-12 gap-2 border-border hover:border-primary/50 hover:text-primary">
              <FileText className="h-4 w-4" /> View invoice
            </Button>
          </Link>
          <Link href="/shop">
            <Button className="w-full rounded-2xl h-12 gap-2 bg-gradient-primary text-primary-foreground border-0">
              <ShoppingBag className="h-4 w-4" /> Shop more
            </Button>
          </Link>
        </div>

        <p className="text-center text-xs text-muted-foreground pb-4">
          A confirmation will be sent to your registered email address.
        </p>
      </main>
      <Footer />
    </div>
  );
}
