"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";
import ProductCard from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { getOrders, getWishlist, removeFromWishlist, getSavedAddresses, addSavedAddress, updateSavedAddress, deleteSavedAddress, setDefaultAddress, cancelOrder } from "@/lib/api";
import type { Product, Order, OrderStatus, SavedAddress, Address } from "@/lib/types";
import { toast } from "sonner";
import {
  Package, Heart, Settings, LogOut, ShoppingBag, Clock,
  CheckCircle2, Truck, XCircle, LayoutDashboard, BarChart2,
  LayoutGrid, Upload, ArrowRight, MapPin, Star, Plus, Pencil, Trash2,
  ExternalLink, AlertTriangle, ImageOff, FileText,
} from "lucide-react";

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  pending:   { label: "Pending",   bg: "bg-amber-100",  text: "text-amber-700",  icon: Clock },
  confirmed: { label: "Confirmed", bg: "bg-blue-100",   text: "text-blue-700",   icon: CheckCircle2 },
  shipped:   { label: "Shipped",   bg: "bg-purple-100", text: "text-purple-700", icon: Truck },
  delivered: { label: "Delivered", bg: "bg-green-100",  text: "text-green-700",  icon: CheckCircle2 },
  cancelled: { label: "Cancelled", bg: "bg-red-100",    text: "text-red-600",    icon: XCircle },
};

const TIMELINE_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending",   label: "Ordered" },
  { status: "confirmed", label: "Confirmed" },
  { status: "shipped",   label: "Shipped" },
  { status: "delivered", label: "Delivered" },
];

const STATUS_ORDER: Record<OrderStatus, number> = {
  pending: 0, confirmed: 1, shipped: 2, delivered: 3, cancelled: -1,
};

function OrderCard({
  order, onCancelled,
}: {
  order: Order;
  onCancelled: (id: string) => void;
}) {
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const currentStep = STATUS_ORDER[order.status];
  const canCancel = order.status === "pending" || order.status === "confirmed";
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelOrder(order.id, "Cancelled by customer");
      toast.success("Order cancelled and stock restored");
      setShowCancelConfirm(false);
      onCancelled(order.id);
    } catch (e: any) {
      toast.error(e.message || "Could not cancel order");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Card className="overflow-hidden border border-border/60 rounded-3xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-muted/30 border-b border-border/50">
        <div>
          <p className="font-bold text-sm tracking-tight">Order #{order.orderId}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCancel && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="text-xs text-destructive/70 hover:text-destructive underline underline-offset-2 transition-colors"
            >
              Cancel order
            </button>
          )}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
            <Icon className="h-3 w-3" />
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Cancel confirmation */}
      {showCancelConfirm && (
        <div className="px-5 py-3 bg-destructive/5 border-b border-destructive/20 flex items-center justify-between gap-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive font-medium">Cancel this order? This cannot be undone.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowCancelConfirm(false)} disabled={cancelling}>
              Keep it
            </Button>
            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? "Cancelling…" : "Yes, cancel"}
            </Button>
          </div>
        </div>
      )}

      {/* Status timeline (not shown for cancelled) */}
      {order.status !== "cancelled" && (
        <div className="px-5 py-3 border-b border-border/40">
          <div className="flex items-center gap-0">
            {TIMELINE_STEPS.map((step, i) => {
              const done = currentStep >= STATUS_ORDER[step.status];
              const active = currentStep === STATUS_ORDER[step.status];
              return (
                <div key={step.status} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      done ? "bg-primary border-primary" : "bg-background border-border"
                    }`}>
                      {done && <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />}
                    </div>
                    <span className={`text-[10px] font-medium whitespace-nowrap ${active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mb-4 mx-1 ${currentStep > STATUS_ORDER[step.status] ? "bg-primary" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tracking number */}
      {order.trackingNumber && order.status === "shipped" && (
        <div className="px-5 py-2.5 bg-purple-50/60 border-b border-purple-100 flex items-center gap-2">
          <Truck className="h-3.5 w-3.5 text-purple-600 shrink-0" />
          <p className="text-xs text-purple-800">
            Tracking: <span className="font-mono font-semibold">{order.trackingNumber}</span>
          </p>
          <Link
            href={`/track-order?id=${order.orderId}`}
            className="ml-auto text-[10px] text-purple-600 hover:underline flex items-center gap-0.5"
          >
            Track <ExternalLink className="h-2.5 w-2.5" />
          </Link>
        </div>
      )}

      {/* Cancellation reason */}
      {order.status === "cancelled" && order.cancelReason && (
        <div className="px-5 py-2.5 bg-red-50/60 border-b border-red-100">
          <p className="text-xs text-red-700">Reason: {order.cancelReason}</p>
        </div>
      )}

      {/* Items */}
      <div className="divide-y divide-border/40">
        {order.items.map((item, i) => {
          const itemTotal = +(item.price * (1 - item.discount_percent / 100) * item.qty).toFixed(2);
          return (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-hero flex-shrink-0 overflow-hidden border border-border/40">
                {item.image_url
                  ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  : <div className="flex items-center justify-center h-full bg-muted"><ImageOff className="h-5 w-5 text-muted-foreground/25" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{item.name}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {item.color && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/50">{item.color}</span>
                  )}
                  {item.size && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/50">{item.size}</span>
                  )}
                  <span className="text-xs text-muted-foreground">Qty: {item.qty}</span>
                </div>
              </div>
              <p className="text-sm font-bold shrink-0">₹{itemTotal}</p>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 bg-muted/20 border-t border-border/50 gap-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary/70" />
          <span className="text-xs text-muted-foreground truncate">
            {order.address.city}, {order.address.state} — {order.address.fullName}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/track-order?id=${order.orderId}`}>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-border bg-background hover:border-primary/50 hover:text-primary transition-all">
              <Truck className="h-3 w-3" /> Track
            </span>
          </Link>
          <Link href={`/invoice/${order.id}`} target="_blank">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-border bg-background hover:border-primary/50 hover:text-primary transition-all">
              <FileText className="h-3 w-3" /> Invoice
            </span>
          </Link>
          <div className="flex items-baseline gap-1 pl-1 border-l border-border ml-1">
            <span className="text-xs text-muted-foreground">Total</span>
            <span className="text-base font-extrabold text-foreground">₹{order.total}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut, updateProfile, isAdmin } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Address form state
  const EMPTY_ADDR = { label: "Home", fullName: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" };
  const INDIAN_STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands","Chandigarh","Dadra & Nagar Haveli","Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"];
  const [addrForm, setAddrForm] = useState<typeof EMPTY_ADDR>(EMPTY_ADDR);
  const [editingAddrId, setEditingAddrId] = useState<string | null>(null);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [addrSaving, setAddrSaving] = useState(false);

  const [activeTab, setActiveTab] = useState("orders");
  const [orderFilter, setOrderFilter] = useState<"all" | "active" | "delivered" | "cancelled">("all");
  const [ordersVisible, setOrdersVisible] = useState(5);

  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth?redirect=/profile");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    setName(user.name || "");

    setOrdersLoading(true);
    getOrders()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setOrdersLoading(false));

    setWishlistLoading(true);
    getWishlist()
      .then(setWishlist)
      .catch(() => {})
      .finally(() => setWishlistLoading(false));

    getSavedAddresses().then(setAddresses).catch(() => {});
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    if (newPassword && newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setSaving(true);
    try {
      const payload: { name?: string; currentPassword?: string; newPassword?: string } = { name };
      if (newPassword) { payload.currentPassword = currentPassword; payload.newPassword = newPassword; }
      await updateProfile(payload);
      toast.success("Profile updated!");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (e: any) {
      toast.error(e.message || "Update failed");
    }
    setSaving(false);
  };

  const openNewAddr = () => { setAddrForm(EMPTY_ADDR); setEditingAddrId(null); setShowAddrForm(true); };
  const openEditAddr = (a: SavedAddress) => {
    setAddrForm({ label: a.label, fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 || "", city: a.city, state: a.state, pincode: a.pincode });
    setEditingAddrId(a.id); setShowAddrForm(true);
  };
  const setAF = (k: string, v: string) => setAddrForm((f) => ({ ...f, [k]: v }));

  const handleSaveAddr = async () => {
    const { fullName, phone, line1, city, state, pincode } = addrForm;
    if (!fullName || !phone || !line1 || !city || !state || !pincode) { toast.error("Please fill all required fields"); return; }
    setAddrSaving(true);
    try {
      let updated: SavedAddress[];
      if (editingAddrId) {
        updated = await updateSavedAddress(editingAddrId, addrForm);
      } else {
        updated = await addSavedAddress(addrForm);
      }
      setAddresses(updated);
      setShowAddrForm(false);
      toast.success(editingAddrId ? "Address updated" : "Address saved");
    } catch (e: any) { toast.error(e.message); }
    setAddrSaving(false);
  };

  const handleDeleteAddr = async (id: string) => {
    try { setAddresses(await deleteSavedAddress(id)); toast.success("Address removed"); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleSetDefault = async (id: string) => {
    try { setAddresses(await setDefaultAddress(id)); toast.success("Default address updated"); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleRemoveWishlist = async (productId: string) => {
    try {
      await removeFromWishlist(productId);
      setWishlist((prev) => prev.filter((p) => p.id !== productId));
      toast.success("Removed from wishlist");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container py-12 space-y-6">
          <Skeleton className="h-32 rounded-3xl" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-3xl" />)}
          </div>
          <Skeleton className="h-12 rounded-full" />
          <div className="space-y-4">
            {[1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-3xl" />)}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const initials = (user.name || user.email).slice(0, 2).toUpperCase();
  const displayName = user.name || "Kawaii Fan";
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;

  const filteredOrders = orders.filter((o) => {
    if (orderFilter === "all") return true;
    if (orderFilter === "active") return ["pending", "confirmed", "shipped"].includes(o.status);
    return o.status === orderFilter;
  });
  const visibleOrders = filteredOrders.slice(0, ordersVisible);

  const ORDER_FILTERS: { key: typeof orderFilter; label: string; count: number }[] = [
    { key: "all",       label: "All orders", count: orders.length },
    { key: "active",    label: "Active",     count: orders.filter((o) => ["pending","confirmed","shipped"].includes(o.status)).length },
    { key: "delivered", label: "Delivered",  count: deliveredCount },
    { key: "cancelled", label: "Cancelled",  count: orders.filter((o) => o.status === "cancelled").length },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      <main className="flex-1 container py-6 space-y-4">
        {/* ── Two-column layout ── */}
        <div className="grid lg:grid-cols-[300px_1fr] gap-5 items-start">

          {/* ══ LEFT SIDEBAR ══ */}
          <div className="space-y-4 lg:sticky lg:top-6">

            {/* Profile card */}
            <Card className="p-5 rounded-3xl bg-card">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-14 w-14 border-2 border-primary/30 flex-shrink-0">
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold text-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h1 className="font-bold truncate">{displayName}</h1>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                  <Badge variant="outline" className="mt-1.5 capitalize text-[10px] px-2 py-0 rounded-full border-primary/30 text-primary">
                    {user.role}
                  </Badge>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { signOut(); router.push("/"); }}
                className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 rounded-full gap-1.5 h-9"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </Button>
            </Card>

            {/* Stats 2×2 */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Package,     label: "Orders",    value: orders.length,    bg: "bg-purple-50", iconColor: "text-purple-500", tab: "orders",    filter: "all" as const },
                { icon: Heart,       label: "Wishlist",  value: wishlist.length,  bg: "bg-pink-50",   iconColor: "text-pink-500",   tab: "wishlist",  filter: null },
                { icon: ShoppingBag, label: "Delivered", value: deliveredCount,   bg: "bg-green-50",  iconColor: "text-green-500",  tab: "orders",    filter: "delivered" as const },
                { icon: MapPin,      label: "Addresses", value: addresses.length, bg: "bg-amber-50",  iconColor: "text-amber-500",  tab: "addresses", filter: null },
              ].map(({ icon: I, label, value, bg, iconColor, tab, filter }) => (
                <button
                  key={label}
                  onClick={() => { setActiveTab(tab); if (filter) { setOrderFilter(filter); setOrdersVisible(5); } }}
                  className="group text-left"
                >
                  <Card className={`p-4 rounded-3xl border transition-all group-hover:border-primary/40 group-hover:shadow-sm cursor-pointer ${activeTab === tab ? "border-primary/30 bg-primary/5" : "border-border/50 bg-card"}`}>
                    <div className={`h-9 w-9 rounded-xl ${bg} grid place-items-center mb-2.5`}>
                      <I className={`h-4 w-4 ${iconColor}`} />
                    </div>
                    <p className="text-2xl font-extrabold leading-none">{value}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
                  </Card>
                </button>
              ))}
            </div>

            {/* Sidebar navigation */}
            <Card className="p-2 rounded-3xl bg-card">
              {[
                { value: "orders",    label: "My Orders",   icon: Package,    badge: orders.length },
                { value: "wishlist",  label: "Wishlist",    icon: Heart,      badge: wishlist.length },
                { value: "addresses", label: "Addresses",   icon: MapPin,     badge: addresses.length },
                { value: "settings",  label: "Settings",    icon: Settings,   badge: 0 },
              ].map(({ value, label, icon: Icon, badge }) => (
                <button
                  key={value}
                  onClick={() => setActiveTab(value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                    activeTab === value
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{label}</span>
                  {badge > 0 && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      activeTab === value ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    }`}>{badge}</span>
                  )}
                  <ArrowRight className="h-3.5 w-3.5 opacity-30" />
                </button>
              ))}
            </Card>
          </div>

          {/* ══ MAIN CONTENT ══ */}
          <div className="min-w-0">

            {/* ── Orders ── */}
            {activeTab === "orders" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg">My Orders</h2>
                  <span className="text-xs text-muted-foreground">{orders.length} total</span>
                </div>

                {ordersLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
                  </div>
                ) : orders.length === 0 ? (
                  <Card className="p-14 text-center rounded-3xl">
                    <Package className="h-14 w-14 text-muted-foreground/40 mx-auto mb-4" />
                    <p className="font-semibold text-lg">No orders yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Your order history will appear here.</p>
                    <Button className="mt-5 rounded-full bg-primary text-primary-foreground" onClick={() => router.push("/shop")}>
                      Start shopping
                    </Button>
                  </Card>
                ) : (
                  <>
                    {/* Filter chips */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {ORDER_FILTERS.map(({ key, label, count }) => (
                        <button
                          key={key}
                          onClick={() => { setOrderFilter(key); setOrdersVisible(5); }}
                          className={`shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                            orderFilter === key
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                          }`}
                        >
                          {label}
                          <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
                            orderFilter === key ? "bg-white/20" : "bg-muted"
                          }`}>{count}</span>
                        </button>
                      ))}
                    </div>

                    {filteredOrders.length === 0 ? (
                      <Card className="p-10 text-center rounded-3xl">
                        <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="font-semibold">No {orderFilter === "all" ? "" : orderFilter} orders</p>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {visibleOrders.map((order) => (
                          <OrderCard
                            key={order.id}
                            order={order}
                            onCancelled={(id) =>
                              setOrders((prev) =>
                                prev.map((o) => o.id === id ? { ...o, status: "cancelled" as const } : o)
                              )
                            }
                          />
                        ))}
                        {filteredOrders.length > ordersVisible && (
                          <button
                            onClick={() => setOrdersVisible((v) => v + 5)}
                            className="w-full py-3.5 rounded-2xl border border-border bg-card text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all"
                          >
                            Show {Math.min(5, filteredOrders.length - ordersVisible)} more
                            <span className="ml-1.5 text-xs opacity-60">({ordersVisible} of {filteredOrders.length})</span>
                          </button>
                        )}
                        {ordersVisible > 5 && filteredOrders.length <= ordersVisible && (
                          <button
                            onClick={() => setOrdersVisible(5)}
                            className="w-full py-3 rounded-2xl border border-border bg-card text-sm text-muted-foreground hover:text-foreground transition-all"
                          >
                            Show less
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Wishlist ── */}
            {activeTab === "wishlist" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg">Wishlist</h2>
                  <span className="text-xs text-muted-foreground">{wishlist.length} item{wishlist.length !== 1 ? "s" : ""}</span>
                </div>
                {wishlistLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
                  </div>
                ) : wishlist.length === 0 ? (
                  <Card className="p-14 text-center rounded-3xl">
                    <Heart className="h-14 w-14 text-muted-foreground/40 mx-auto mb-4" />
                    <p className="font-semibold text-lg">Your wishlist is empty</p>
                    <p className="text-sm text-muted-foreground mt-1">Tap the heart on any product to save it here.</p>
                    <Button className="mt-5 rounded-full bg-primary text-primary-foreground" onClick={() => router.push("/shop")}>
                      Browse products
                    </Button>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {wishlist.map((p) => (
                      <div key={p.id} className="relative group/item">
                        <ProductCard p={p} />
                        <button
                          onClick={() => handleRemoveWishlist(p.id)}
                          className="absolute top-2 left-2 z-10 h-7 w-7 rounded-full bg-destructive text-white text-xs font-bold flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity"
                          aria-label="Remove from wishlist"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Addresses ── */}
            {activeTab === "addresses" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg">Saved Addresses</h2>
                  <Button size="sm" className="rounded-full bg-gradient-primary text-primary-foreground border-0 gap-1.5" onClick={openNewAddr}>
                    <Plus className="h-4 w-4" /> Add address
                  </Button>
                </div>
                <div className="space-y-3">
                  {addresses.length === 0 ? (
                    <Card className="p-14 text-center rounded-3xl">
                      <MapPin className="h-14 w-14 text-muted-foreground/40 mx-auto mb-4" />
                      <p className="font-semibold text-lg">No saved addresses</p>
                      <p className="text-sm text-muted-foreground mt-1">Save an address to speed up checkout.</p>
                    </Card>
                  ) : addresses.map((a) => (
                    <Card key={a.id} className={`p-4 border-2 transition-colors rounded-3xl ${a.isDefault ? "border-primary/50 bg-primary/5" : "border-border bg-card"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-primary">{a.label}</span>
                            {a.isDefault && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                <Star className="h-2.5 w-2.5 fill-amber-400 stroke-amber-400" /> Default
                              </span>
                            )}
                          </div>
                          <p className="font-semibold">{a.fullName}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p>
                          <p className="text-sm text-muted-foreground">{a.city}, {a.state} — {a.pincode}</p>
                          <p className="text-sm text-muted-foreground">{a.phone}</p>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <Button variant="outline" size="sm" className="rounded-full h-8 text-xs gap-1" onClick={() => openEditAddr(a)}>
                            <Pencil className="h-3 w-3" /> Edit
                          </Button>
                          {!a.isDefault && (
                            <Button variant="outline" size="sm" className="rounded-full h-8 text-xs gap-1" onClick={() => handleSetDefault(a.id)}>
                              <Star className="h-3 w-3" /> Default
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="rounded-full h-8 text-xs gap-1 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteAddr(a.id)}>
                            <Trash2 className="h-3 w-3" /> Remove
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                <Dialog open={showAddrForm} onOpenChange={(open) => { if (!open) setShowAddrForm(false); }}>
                  <DialogContent className="rounded-3xl max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">{editingAddrId ? "Edit address" : "New address"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1.5">
                        <Label>Label</Label>
                        <select value={addrForm.label} onChange={(e) => setAF("label", e.target.value)}
                          className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                          {["Home", "Work", "Other"].map((l) => <option key={l}>{l}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Phone</Label>
                        <Input placeholder="98765 43210" value={addrForm.phone} onChange={(e) => setAF("phone", e.target.value)} className="rounded-xl" />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label>Full name</Label>
                        <Input placeholder="Anushka Sharma" value={addrForm.fullName} onChange={(e) => setAF("fullName", e.target.value)} className="rounded-xl" />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label>Address line 1</Label>
                        <Input placeholder="House / flat / block no., street" value={addrForm.line1} onChange={(e) => setAF("line1", e.target.value)} className="rounded-xl" />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label>Address line 2 <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <Input placeholder="Landmark, area" value={addrForm.line2} onChange={(e) => setAF("line2", e.target.value)} className="rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>City</Label>
                        <Input placeholder="Mumbai" value={addrForm.city} onChange={(e) => setAF("city", e.target.value)} className="rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Pincode</Label>
                        <Input placeholder="400001" maxLength={6} value={addrForm.pincode} onChange={(e) => setAF("pincode", e.target.value.replace(/\D/g, ""))} className="rounded-xl" />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label>State</Label>
                        <select value={addrForm.state} onChange={(e) => setAF("state", e.target.value)}
                          className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                          <option value="">Select state</option>
                          {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button className="flex-1 rounded-full bg-gradient-primary text-primary-foreground border-0 h-11" disabled={addrSaving} onClick={handleSaveAddr}>
                        {addrSaving ? "Saving…" : editingAddrId ? "Save changes" : "Save address"}
                      </Button>
                      <Button variant="outline" className="rounded-full h-11 px-5" onClick={() => setShowAddrForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* ── Settings ── */}
            {activeTab === "settings" && (
              <div className="space-y-4">
                <h2 className="font-bold text-lg">Account Settings</h2>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <Card className="p-5 space-y-4 rounded-3xl">
                    <h3 className="font-bold">Account details</h3>
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Display name</Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="rounded-full" maxLength={80} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email address</Label>
                      <Input value={user.email} disabled className="rounded-full opacity-60 cursor-not-allowed" />
                      <p className="text-xs text-muted-foreground px-1">Email cannot be changed.</p>
                    </div>
                  </Card>
                  <Card className="p-5 space-y-4 rounded-3xl">
                    <div>
                      <h3 className="font-bold">Change password</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">Leave blank to keep your current password.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="currentPw">Current password</Label>
                      <Input id="currentPw" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="rounded-full" autoComplete="current-password" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="newPw">New password</Label>
                      <Input id="newPw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="rounded-full" autoComplete="new-password" minLength={6} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPw">Confirm new password</Label>
                      <Input id="confirmPw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="rounded-full" autoComplete="new-password" />
                    </div>
                  </Card>
                  <Button type="submit" disabled={saving} className="w-full rounded-full bg-primary text-primary-foreground h-12 text-base">
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                </form>
              </div>
            )}

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
