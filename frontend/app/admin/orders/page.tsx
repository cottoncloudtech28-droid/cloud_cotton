"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/shop/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  RefreshCw, ChevronDown, ChevronUp, Truck, MapPin,
  Clock, CheckCircle2, XCircle, Search, Package, ImageOff,
  FileText, Download, Receipt,
} from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";
import { getAllOrders, updateOrderStatus, setOrderTracking, pushToShiprocket, downloadGstr1Csv } from "@/lib/api";
import Link from "next/link";
import type { Order, OrderStatus } from "@/lib/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string; border: string }> = {
  pending:   { label: "Pending",   bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200" },
  confirmed: { label: "Confirmed", bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200" },
  shipped:   { label: "Shipped",   bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  delivered: { label: "Delivered", bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200" },
  cancelled: { label: "Cancelled", bg: "bg-red-50",    text: "text-red-600",    border: "border-red-200" },
};

const ALL_STATUSES: OrderStatus[] = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

// ── Order row ─────────────────────────────────────────────────────────────────

function OrderRow({ order, onUpdated }: {
  order: Order;
  onUpdated: (updated: Order) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [trackingInput, setTrackingInput] = useState(order.trackingNumber ?? "");
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [srLoading, setSrLoading] = useState(false);

  const cfg = STATUS_CONFIG[order.status];
  const customer = typeof order.user === "object" ? order.user : null;

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (newStatus === order.status) return;
    setStatusLoading(true);
    try {
      const updated = await updateOrderStatus(order.id, newStatus);
      onUpdated(updated);
      toast.success(`Order ${order.orderId} → ${newStatus}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSaveTracking = async () => {
    setTrackingLoading(true);
    try {
      const updated = await setOrderTracking(order.id, trackingInput.trim());
      onUpdated(updated);
      toast.success("Tracking number saved");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTrackingLoading(false);
    }
  };

  const handlePushShiprocket = async () => {
    setSrLoading(true);
    try {
      const updated = await pushToShiprocket(order.id);
      onUpdated(updated);
      toast.success(updated.awb_code ? `Pushed! AWB: ${updated.awb_code}` : "Pushed to Shiprocket");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSrLoading(false);
    }
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Summary row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 py-3.5 items-center bg-card hover:bg-accent/20 transition-colors">
        {/* Order ID */}
        <div className="md:col-span-2 min-w-0">
          <p className="font-mono font-semibold text-sm truncate">#{order.orderId}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>

        {/* Customer */}
        <div className="md:col-span-2 min-w-0">
          <p className="text-sm font-medium truncate">{customer?.name || "—"}</p>
          <p className="text-[10px] text-muted-foreground truncate">{customer?.email || "—"}</p>
        </div>

        {/* Items */}
        <div className="md:col-span-2 text-sm text-muted-foreground">
          {order.items.length} item{order.items.length !== 1 ? "s" : ""}
        </div>

        {/* Total */}
        <div className="md:col-span-1 text-sm font-bold">₹{order.total}</div>

        {/* Payment */}
        <div className="md:col-span-1">
          <Badge variant="outline" className="text-[10px] capitalize">
            {order.payment_method ?? "—"}
          </Badge>
        </div>

        {/* Status select */}
        <div className="md:col-span-2">
          <select
            value={order.status}
            onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
            disabled={statusLoading}
            className={`w-full h-8 rounded-lg border text-xs font-semibold px-2 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 ${cfg.bg} ${cfg.text} ${cfg.border}`}
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="md:col-span-2 flex flex-wrap justify-end items-center gap-1.5">
          {!order.shiprocket_order_id && order.status !== "cancelled" && (
            <Button
              size="sm"
              className="h-8 px-2.5 text-xs bg-orange-500 hover:bg-orange-600 text-white border-0 gap-1"
              disabled={srLoading}
              onClick={handlePushShiprocket}
            >
              {srLoading
                ? <RefreshCw className="h-3 w-3 animate-spin" />
                : <Truck className="h-3 w-3" />}
              <span className="hidden sm:inline">{srLoading ? "Pushing…" : "Push"}</span>
            </Button>
          )}
          {order.awb_code && (
            <span className="hidden sm:inline text-[10px] font-mono text-purple-700 bg-purple-50 border border-purple-100 px-2 py-1 rounded-lg truncate max-w-[90px]" title={order.awb_code}>
              {order.awb_code}
            </span>
          )}
          {order.shiprocket_order_id && !order.awb_code && (
            <span className="hidden sm:inline text-[10px] text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg">
              No AWB
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={() => setExpanded((e) => !e)} className="h-8 px-3">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="ml-1.5 text-xs">{expanded ? "Less" : "Details"}</span>
          </Button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border bg-muted/20 px-4 py-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Shipping address */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Ship to
              </p>
              <p className="text-sm font-medium">{order.address.fullName}</p>
              <p className="text-xs text-muted-foreground">
                {order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {order.address.city}, {order.address.state} — {order.address.pincode}
              </p>
              <p className="text-xs text-muted-foreground">{order.address.phone}</p>
            </div>

            {/* Tracking number */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Truck className="h-3 w-3" /> Tracking number (AWB)
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter AWB / tracking number"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  className="h-8 text-sm font-mono"
                />
                <Button size="sm" variant="outline" className="h-8 shrink-0"
                  disabled={trackingLoading}
                  onClick={handleSaveTracking}>
                  {trackingLoading ? "…" : "Save"}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Visible to customer on their order tracking page once order is marked "Shipped".
              </p>
            </div>
          </div>

          {/* ── Shiprocket ── */}
          <div className="rounded-lg border border-border/60 bg-card p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Package className="h-3 w-3" /> Shiprocket
            </p>

            {order.shiprocket_order_id ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">SR Order ID</span>
                  <p className="font-mono font-semibold">{order.shiprocket_order_id}</p>
                </div>
                {order.shiprocket_shipment_id && (
                  <div>
                    <span className="text-muted-foreground">Shipment ID</span>
                    <p className="font-mono font-semibold">{order.shiprocket_shipment_id}</p>
                  </div>
                )}
                {order.awb_code && (
                  <div>
                    <span className="text-muted-foreground">AWB Code</span>
                    <p className="font-mono font-semibold text-purple-700">{order.awb_code}</p>
                  </div>
                )}
                {order.courier_name && (
                  <div>
                    <span className="text-muted-foreground">Courier</span>
                    <p className="font-semibold">{order.courier_name}</p>
                  </div>
                )}
                {!order.awb_code && (
                  <div className="col-span-2">
                    <p className="text-amber-600 text-[10px] mb-1.5">AWB not assigned yet — click Re-push to retry.</p>
                    <Button size="sm" variant="outline" className="h-7 text-xs" disabled={srLoading} onClick={handlePushShiprocket}>
                      {srLoading ? "Pushing…" : "Re-push to Shiprocket"}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-xs text-muted-foreground flex-1">
                  {order.status === "cancelled"
                    ? "Cannot push cancelled orders."
                    : "This order has not been pushed to Shiprocket yet."}
                </p>
                {order.status !== "cancelled" && (
                  <Button size="sm" className="h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white border-0 shrink-0"
                    disabled={srLoading} onClick={handlePushShiprocket}>
                    {srLoading ? "Pushing…" : "Push to Shiprocket"}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Invoice + GST info */}
          <div className="flex items-center justify-between flex-wrap gap-3 py-2 border-t border-border/50">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {order.invoice_number && (
                <span className="font-mono bg-muted px-2 py-1 rounded">
                  INV: {order.invoice_number}
                </span>
              )}
              {order.gst_breakdown && (
                <span>
                  Tax: ₹{order.gst_breakdown.total_tax?.toFixed(2)}
                  {" "}({order.gst_breakdown.is_interstate ? "IGST" : "CGST+SGST"})
                </span>
              )}
            </div>
            <Link href={`/invoice/${order.id}`} target="_blank">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 rounded-full">
                <FileText className="h-3 w-3" /> View Invoice
              </Button>
            </Link>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Order items</p>
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-card rounded-lg px-3 py-2.5 border border-border/50">
                  <div className="h-10 w-10 rounded-md bg-muted overflow-hidden border border-border shrink-0">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      : <div className="flex items-center justify-center h-full bg-muted"><ImageOff className="h-4 w-4 text-muted-foreground/25" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {item.size && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{item.size}</span>}
                      {item.color && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{item.color}</span>}
                      {item.character && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{item.character}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">×{item.qty}</p>
                    <p className="text-sm font-semibold">
                      ₹{+(item.price * (1 - item.discount_percent / 100) * item.qty).toFixed(0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cancel reason if applicable */}
          {order.status === "cancelled" && order.cancelReason && (
            <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">
              Cancellation reason: {order.cancelReason}
              {order.cancelledBy && ` (by ${order.cancelledBy})`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminOrdersPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) router.push(`/auth?redirect=${encodeURIComponent("/admin/orders")}`);
  }, [user, loading, router]);

  const loadOrders = useCallback(async () => {
    if (!isAdmin) return;
    setFetching(true);
    try {
      const data = await getAllOrders();
      setOrders(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setFetching(false);
    }
  }, [isAdmin]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const handleOrderUpdated = (updated: Order) => {
    setOrders((prev) => prev.map((o) => o.id === updated.id ? updated : o));
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const counts = ALL_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length;
    return acc;
  }, {});
  const todayRevenue = orders
    .filter((o) => o.status !== "cancelled" && new Date(o.createdAt).toDateString() === new Date().toDateString())
    .reduce((s, o) => s + o.total, 0);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const customerName = typeof o.user === "object" ? (o.user?.name ?? "") : "";
      const customerEmail = typeof o.user === "object" ? (o.user?.email ?? "") : "";
      return (
        o.orderId.toLowerCase().includes(q) ||
        customerName.toLowerCase().includes(q) ||
        customerEmail.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) return <AdminPageSkeleton />;
  if (!isAdmin) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <div className="h-10 flex items-center border-b px-2">
            <SidebarTrigger />
            <span className="ml-2 text-sm text-muted-foreground">Admin / Orders</span>
          </div>
          <main className="container py-8 space-y-6">

            {/* Header */}
            <div className="flex items-end justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-4xl font-bold">Orders</h1>
                <p className="text-muted-foreground mt-1">Manage, fulfil, and track all customer orders</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 rounded-full"
                  onClick={() => { downloadGstr1Csv(); toast.success("Downloading GSTR-1 CSV…"); }}
                >
                  <Download className="h-4 w-4" /> GSTR-1 Export
                </Button>
                <Link href="/admin/gst">
                  <Button variant="outline" size="sm" className="gap-1.5 rounded-full">
                    <Receipt className="h-4 w-4" /> GST Settings
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={loadOrders} disabled={fetching} className="rounded-full">
                  <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Stats bar */}
            {!fetching && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: "Total", value: orders.length, color: "text-foreground" },
                  { label: "Pending", value: counts.pending, color: "text-amber-600" },
                  { label: "Confirmed", value: counts.confirmed, color: "text-blue-600" },
                  { label: "Shipped", value: counts.shipped, color: "text-purple-600" },
                  { label: "Delivered", value: counts.delivered, color: "text-green-600" },
                  { label: "Today's revenue", value: `₹${todayRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, color: "text-primary" },
                ].map((stat) => (
                  <Card key={stat.label} className="p-3 text-center">
                    <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
                  </Card>
                ))}
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              {/* Status filter pills */}
              <div className="flex flex-wrap gap-1.5">
                {(["all", ...ALL_STATUSES] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      statusFilter === s
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {s === "all" ? `All (${orders.length})` : `${STATUS_CONFIG[s].label} (${counts[s]})`}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search order ID or customer…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 w-64 rounded-full text-sm"
                />
              </div>
            </div>

            {/* Table header */}
            {!fetching && filtered.length > 0 && (
              <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <span className="col-span-2">Order</span>
                <span className="col-span-2">Customer</span>
                <span className="col-span-2">Items</span>
                <span className="col-span-1">Total</span>
                <span className="col-span-1">Payment</span>
                <span className="col-span-2">Status</span>
                <span className="col-span-2 text-right">Actions</span>
              </div>
            )}

            {/* Orders list */}
            {fetching ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <Card className="p-12 text-center space-y-3">
                <Package className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                <p className="font-semibold text-lg">
                  {search || statusFilter !== "all" ? "No orders match your filters" : "No orders yet"}
                </p>
                <p className="text-muted-foreground text-sm">
                  {search || statusFilter !== "all"
                    ? "Try clearing the search or changing the status filter."
                    : "Orders will appear here once customers start placing them."}
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {filtered.map((order) => (
                  <OrderRow key={order.id} order={order} onUpdated={handleOrderUpdated} />
                ))}
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Showing {filtered.length} of {orders.length} orders
                </p>
              </div>
            )}

          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
