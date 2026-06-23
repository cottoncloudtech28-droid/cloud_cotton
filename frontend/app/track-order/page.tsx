"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trackOrder, getShiprocketTrackingPublic } from "@/lib/api";
import type { PublicOrderTrack, OrderStatus, ShiprocketTracking } from "@/lib/types";
import {
  Search, Package, CheckCircle2, Truck, Clock, XCircle, MapPin, ImageOff,
} from "lucide-react";

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  pending:   { label: "Pending",   bg: "bg-amber-100",  text: "text-amber-700",  icon: Clock },
  confirmed: { label: "Confirmed", bg: "bg-blue-100",   text: "text-blue-700",   icon: CheckCircle2 },
  shipped:   { label: "Shipped",   bg: "bg-purple-100", text: "text-purple-700", icon: Truck },
  delivered: { label: "Delivered", bg: "bg-green-100",  text: "text-green-700",  icon: CheckCircle2 },
  cancelled: { label: "Cancelled", bg: "bg-red-100",    text: "text-red-600",    icon: XCircle },
};

const TIMELINE_STEPS: { status: OrderStatus; label: string; desc: string }[] = [
  { status: "pending",   label: "Order placed",  desc: "We received your order" },
  { status: "confirmed", label: "Confirmed",     desc: "Your order is being packed" },
  { status: "shipped",   label: "Shipped",       desc: "On its way to you" },
  { status: "delivered", label: "Delivered",     desc: "Enjoy your purchase!" },
];

const STATUS_ORDER: Record<OrderStatus, number> = {
  pending: 0, confirmed: 1, shipped: 2, delivered: 3, cancelled: -1,
};

// ── Result display ─────────────────────────────────────────────────────────────

function ShiprocketEvents({ orderId }: { orderId: string }) {
  const [srData, setSrData] = useState<ShiprocketTracking | null>(null);
  const [srLoading, setSrLoading] = useState(true);

  useEffect(() => {
    getShiprocketTrackingPublic(orderId)
      .then((res) => setSrData(res.tracking_data ?? null))
      .catch(() => {})
      .finally(() => setSrLoading(false));
  }, [orderId]);

  if (srLoading) return <div className="h-16 animate-pulse bg-muted rounded-2xl" />;
  if (!srData?.shipment_track_activities?.length) return null;

  return (
    <div className="rounded-3xl border border-border/60 bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50 bg-muted/30 flex items-center justify-between">
        <h2 className="font-bold">Live tracking updates</h2>
        {srData.courier_name && (
          <span className="text-xs text-muted-foreground bg-purple-50 text-purple-700 px-2 py-1 rounded-full font-medium">
            {srData.courier_name}
          </span>
        )}
      </div>
      <div className="divide-y divide-border/40 max-h-72 overflow-y-auto">
        {srData.shipment_track_activities.map((act, i) => (
          <div key={i} className="flex gap-3 px-5 py-3">
            <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${i === 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{act.activity || act.status}</p>
              {act.location && <p className="text-xs text-muted-foreground">{act.location}</p>}
            </div>
            <p className="text-[10px] text-muted-foreground shrink-0 text-right">
              {act.date ? new Date(act.date).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrackResult({ data }: { data: PublicOrderTrack }) {
  const cfg = STATUS_CONFIG[data.status];
  const Icon = cfg.icon;
  const currentStep = STATUS_ORDER[data.status];
  const isCancelled = data.status === "cancelled";

  return (
    <div className="space-y-6 mt-8">
      {/* Order header */}
      <Card className="p-5 rounded-3xl space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-1">Order ID</p>
            <p className="text-2xl font-bold">#{data.orderId}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Placed on {new Date(data.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${cfg.bg} ${cfg.text}`}>
            <Icon className="h-4 w-4" />
            {cfg.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary/60 shrink-0" />
          Delivering to: {data.address.city}, {data.address.state} — {data.address.pincode}
        </div>

        {/* Tracking number */}
        {data.trackingNumber && (
          <div className="bg-purple-50 border border-purple-100 rounded-2xl px-4 py-3 flex items-center gap-3">
            <Truck className="h-4 w-4 text-purple-600 shrink-0" />
            <div>
              <p className="text-xs text-purple-700 font-medium">Shipment tracking number</p>
              <p className="font-mono font-bold text-purple-900 text-sm mt-0.5">{data.trackingNumber}</p>
            </div>
          </div>
        )}

        {/* Cancel reason */}
        {isCancelled && data.cancelReason && (
          <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
            <p className="text-xs text-red-700">Cancellation reason: {data.cancelReason}</p>
          </div>
        )}
      </Card>

      {/* Timeline */}
      {!isCancelled && (
        <Card className="p-6 rounded-3xl">
          <h2 className="font-bold text-lg mb-6">Shipment timeline</h2>
          <div className="space-y-0">
            {TIMELINE_STEPS.map((step, i) => {
              const done = currentStep >= STATUS_ORDER[step.status];
              const active = currentStep === STATUS_ORDER[step.status];
              const last = i === TIMELINE_STEPS.length - 1;

              return (
                <div key={step.status} className="flex gap-4">
                  {/* Icon column */}
                  <div className="flex flex-col items-center">
                    <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center shrink-0 z-10 transition-all ${
                      done
                        ? "bg-primary border-primary"
                        : active
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background"
                    }`}>
                      {done
                        ? <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                        : <div className={`h-2.5 w-2.5 rounded-full ${active ? "bg-primary" : "bg-border"}`} />}
                    </div>
                    {!last && (
                      <div className={`w-0.5 flex-1 my-1 min-h-[32px] ${done ? "bg-primary" : "bg-border"}`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`pb-6 ${last ? "pb-0" : ""}`}>
                    <p className={`font-semibold text-sm ${active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                    {active && step.status === "shipped" && data.trackingNumber && (
                      <p className="text-xs text-purple-700 mt-1 font-mono">AWB: {data.trackingNumber}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {isCancelled && (
        <Card className="p-6 rounded-3xl text-center space-y-2">
          <XCircle className="h-10 w-10 text-red-400 mx-auto" />
          <p className="font-semibold">This order was cancelled</p>
          <p className="text-sm text-muted-foreground">
            If you have questions about this cancellation, please contact us at{" "}
            <a href="mailto:hello@cottoncloud.co" className="text-primary underline underline-offset-2">hello@cottoncloud.co</a>.
          </p>
        </Card>
      )}

      {/* Shiprocket live tracking events */}
      {!isCancelled && data.trackingNumber && (
        <ShiprocketEvents orderId={data.orderId} />
      )}

      {/* Items */}
      <Card className="rounded-3xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 bg-muted/30">
          <h2 className="font-bold">Items in this order</h2>
        </div>
        <div className="divide-y divide-border/40">
          {data.items.map((item, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="h-14 w-14 rounded-xl bg-muted overflow-hidden border border-border/40 shrink-0">
                {item.image_url
                  ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  : <div className="flex items-center justify-center h-full bg-muted"><ImageOff className="h-5 w-5 text-muted-foreground/25" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{item.name}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {item.size && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{item.size}</span>}
                  {item.color && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{item.color}</span>}
                  <span className="text-xs text-muted-foreground">Qty: {item.qty}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-center gap-3 pt-2">
        <Button variant="outline" className="rounded-full" onClick={() => window.location.reload()}>
          Track another order
        </Button>
        <Link href="/shop">
          <Button className="rounded-full bg-gradient-primary text-primary-foreground border-0">Continue shopping</Button>
        </Link>
      </div>
    </div>
  );
}

// ── Search form + page ─────────────────────────────────────────────────────────

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get("id") ?? "");
  const [result, setResult] = useState<PublicOrderTrack | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const id = orderId.trim().toUpperCase();
    if (!id) return;
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = await trackOrder(id);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Order not found. Check the ID and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-search if URL has ?id=
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) { setOrderId(id); setTimeout(handleSearch, 100); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex-1 container py-12 max-w-2xl mx-auto">
      <div className="text-center space-y-2 mb-8">
        <div className="h-16 w-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <Package className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold">Track your order</h1>
        <p className="text-muted-foreground">Enter your order ID to see live status and shipping updates.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="e.g. KCS1A2B3C4D"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value.toUpperCase())}
          className="rounded-full text-center font-mono tracking-wider h-12 text-base flex-1"
        />
        <Button type="submit" disabled={loading || !orderId.trim()} className="rounded-full h-12 px-6 bg-gradient-primary text-primary-foreground border-0">
          <Search className="h-4 w-4 mr-2" />
          {loading ? "Searching…" : "Track"}
        </Button>
      </form>

      {error && (
        <div className="mt-4 bg-destructive/10 text-destructive rounded-2xl px-4 py-3 text-sm text-center">
          {error}
        </div>
      )}

      {result && <TrackResult data={result} />}

      <p className="text-xs text-center text-muted-foreground mt-8">
        Your order ID is in the confirmation shown after checkout, and in your{" "}
        <Link href="/profile" className="underline underline-offset-2 text-primary">order history</Link>.
      </p>
    </main>
  );
}

export default function TrackOrderPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Suspense fallback={
        <main className="flex-1 container py-12 max-w-2xl mx-auto">
          <div className="h-64 animate-pulse bg-muted rounded-3xl" />
        </main>
      }>
        <TrackOrderContent />
      </Suspense>
      <Footer />
    </div>
  );
}
