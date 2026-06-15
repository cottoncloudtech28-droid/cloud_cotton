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
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { getOrders, getWishlist, removeFromWishlist, getSavedAddresses, addSavedAddress, updateSavedAddress, deleteSavedAddress, setDefaultAddress } from "@/lib/api";
import type { Product, Order, OrderStatus, SavedAddress, Address } from "@/lib/types";
import { toast } from "sonner";
import {
  Package, Heart, Settings, LogOut, ShoppingBag, Clock,
  CheckCircle2, Truck, XCircle, LayoutDashboard, BarChart2,
  LayoutGrid, Upload, ArrowRight, MapPin, Star, Plus, Pencil, Trash2,
} from "lucide-react";

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  pending:   { label: "Pending",   bg: "bg-amber-100",  text: "text-amber-700",  icon: Clock },
  confirmed: { label: "Confirmed", bg: "bg-blue-100",   text: "text-blue-700",   icon: CheckCircle2 },
  shipped:   { label: "Shipped",   bg: "bg-purple-100", text: "text-purple-700", icon: Truck },
  delivered: { label: "Delivered", bg: "bg-green-100",  text: "text-green-700",  icon: CheckCircle2 },
  cancelled: { label: "Cancelled", bg: "bg-red-100",    text: "text-red-600",    icon: XCircle },
};

function OrderCard({ order }: { order: Order }) {
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-semibold text-sm">Order #{order.orderId}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
          <Icon className="h-3 w-3" />
          {cfg.label}
        </span>
      </div>
      <Separator className="my-3" />
      <div className="space-y-3">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-xl bg-muted flex-shrink-0 overflow-hidden border border-border">
              {item.image_url
                ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                : <div className="flex items-center justify-center h-full text-2xl">🌸</div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.name}</p>
              <div className="flex flex-wrap gap-2 mt-0.5">
                {item.size  && <span className="text-xs text-muted-foreground">{item.size}</span>}
                {item.color && <span className="text-xs text-muted-foreground">{item.color}</span>}
                <span className="text-xs text-muted-foreground">Qty: {item.qty}</span>
              </div>
            </div>
            <p className="text-sm font-semibold flex-shrink-0">
              ₹{+(item.price * (1 - item.discount_percent / 100) * item.qty).toFixed(2)}
            </p>
          </div>
        ))}
      </div>
      <Separator className="my-3" />
      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground truncate max-w-[60%]">
          {order.address.city}, {order.address.state} — {order.address.fullName}
        </p>
        <p className="font-bold text-base">₹{order.total}</p>
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
      <div className="min-h-screen">
        <Navbar />
        <main className="container py-12 space-y-6">
          <Skeleton className="h-32 rounded-2xl" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        </main>
      </div>
    );
  }

  const initials = (user.name || user.email).slice(0, 2).toUpperCase();
  const displayName = user.name || "Kawaii Fan";
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-8 space-y-6">

        {/* ── Profile header ──────────────────────────────────────────────── */}
        <Card className="p-6">
          <div className="flex items-center gap-5">
            <Avatar className="h-20 w-20 border-2 border-primary/30 flex-shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground font-bold text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate">{displayName}</h1>
              <p className="text-muted-foreground text-sm truncate mt-0.5">{user.email}</p>
              <Badge variant="outline" className="mt-2 capitalize text-xs px-2.5 rounded-full">
                {user.role}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { signOut(); router.push("/"); }}
              className="flex-shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10 rounded-full"
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Sign out
            </Button>
          </div>
        </Card>

        {/* ── Admin panel shortcut (admins only) ─────────────────────────── */}
        {isAdmin && (
          <Card className="p-5 border-2 border-primary/30 bg-primary/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <LayoutDashboard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Admin Dashboard</p>
                <p className="text-xs text-muted-foreground">You have admin access to manage the store</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Products",   href: "/admin",            icon: Package },
                { label: "Inventory",  href: "/admin/inventory",  icon: BarChart2 },
                { label: "Categories", href: "/admin/categories", icon: LayoutGrid },
                { label: "Bulk Upload",href: "/admin/bulk",       icon: Upload },
              ].map(({ label, href, icon: Icon }) => (
                <Link key={href} href={href}>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-background hover:border-primary transition-colors cursor-pointer group">
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    <span className="text-xs font-medium">{label}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        )}

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: Package,     label: "Total orders", value: orders.length },
            { icon: Heart,       label: "Wishlist",     value: wishlist.length },
            { icon: ShoppingBag, label: "Delivered",    value: deliveredCount },
            { icon: MapPin,      label: "Addresses",    value: addresses.length },
          ].map(({ icon: I, label, value }) => (
            <Card key={label} className="p-4 text-center">
              <I className="h-6 w-6 text-primary mx-auto mb-1.5" />
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </Card>
          ))}
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <Tabs defaultValue="orders">
          <TabsList className="rounded-full p-1 h-auto bg-muted w-full grid grid-cols-4 mb-6">
            <TabsTrigger value="orders" className="rounded-full text-sm gap-1.5">
              <Package className="h-4 w-4" /> Orders
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="rounded-full text-sm gap-1.5">
              <Heart className="h-4 w-4" /> Wishlist
            </TabsTrigger>
            <TabsTrigger value="addresses" className="rounded-full text-sm gap-1.5">
              <MapPin className="h-4 w-4" /> Addresses
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-full text-sm gap-1.5">
              <Settings className="h-4 w-4" /> Settings
            </TabsTrigger>
          </TabsList>

          {/* Orders */}
          <TabsContent value="orders" className="space-y-4">
            {ordersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
              </div>
            ) : orders.length === 0 ? (
              <Card className="p-14 text-center">
                <Package className="h-14 w-14 text-muted-foreground/40 mx-auto mb-4" />
                <p className="font-semibold text-lg">No orders yet</p>
                <p className="text-sm text-muted-foreground mt-1">Your order history will appear here.</p>
                <Button className="mt-5 rounded-full bg-primary text-primary-foreground" onClick={() => router.push("/shop")}>
                  Start shopping
                </Button>
              </Card>
            ) : (
              orders.map((order) => <OrderCard key={order.id} order={order} />)
            )}
          </TabsContent>

          {/* Wishlist */}
          <TabsContent value="wishlist">
            {wishlistLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
              </div>
            ) : wishlist.length === 0 ? (
              <Card className="p-14 text-center">
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
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Addresses */}
          <TabsContent value="addresses" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {addresses.length === 0 ? "No saved addresses yet." : `${addresses.length} saved address${addresses.length !== 1 ? "es" : ""}`}
              </p>
              {!showAddrForm && (
                <Button size="sm" className="rounded-full bg-gradient-primary text-primary-foreground border-0 gap-1.5" onClick={openNewAddr}>
                  <Plus className="h-4 w-4" /> Add address
                </Button>
              )}
            </div>

            {/* Address cards */}
            {!showAddrForm && (
              <div className="space-y-3">
                {addresses.map((a) => (
                  <Card key={a.id} className={`p-4 border-2 transition-colors ${a.isDefault ? "border-primary/50 bg-primary/5" : "border-border"}`}>
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
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {a.line1}{a.line2 ? `, ${a.line2}` : ""}
                        </p>
                        <p className="text-sm text-muted-foreground">{a.city}, {a.state} — {a.pincode}</p>
                        <p className="text-sm text-muted-foreground">{a.phone}</p>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <Button variant="outline" size="sm" className="rounded-full h-8 text-xs gap-1" onClick={() => openEditAddr(a)}>
                          <Pencil className="h-3 w-3" /> Edit
                        </Button>
                        {!a.isDefault && (
                          <Button variant="outline" size="sm" className="rounded-full h-8 text-xs gap-1" onClick={() => handleSetDefault(a.id)}>
                            <Star className="h-3 w-3" /> Set default
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="rounded-full h-8 text-xs gap-1 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteAddr(a.id)}>
                          <Trash2 className="h-3 w-3" /> Remove
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}

                {addresses.length === 0 && (
                  <Card className="p-14 text-center">
                    <MapPin className="h-14 w-14 text-muted-foreground/40 mx-auto mb-4" />
                    <p className="font-semibold text-lg">No saved addresses</p>
                    <p className="text-sm text-muted-foreground mt-1">Save an address to speed up checkout.</p>
                  </Card>
                )}
              </div>
            )}

            {/* Add / Edit form */}
            {showAddrForm && (
              <Card className="p-5 space-y-4">
                <h3 className="font-bold text-lg">{editingAddrId ? "Edit address" : "New address"}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Label</Label>
                    <select value={addrForm.label} onChange={(e) => setAF("label", e.target.value)}
                      className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      {["Home","Work","Other"].map((l) => <option key={l}>{l}</option>)}
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
                <div className="flex gap-2 pt-1">
                  <Button className="flex-1 rounded-full bg-gradient-primary text-primary-foreground border-0" disabled={addrSaving} onClick={handleSaveAddr}>
                    {addrSaving ? "Saving…" : editingAddrId ? "Save changes" : "Save address"}
                  </Button>
                  <Button variant="outline" className="rounded-full" onClick={() => setShowAddrForm(false)}>Cancel</Button>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings">
            <form onSubmit={handleSaveProfile} className="space-y-5 max-w-md">
              <Card className="p-6 space-y-4">
                <h3 className="font-bold text-lg">Account details</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Display name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Your name" className="rounded-full" maxLength={80} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email address</Label>
                  <Input value={user.email} disabled className="rounded-full opacity-60 cursor-not-allowed" />
                  <p className="text-xs text-muted-foreground px-1">Email cannot be changed.</p>
                </div>
              </Card>

              <Card className="p-6 space-y-4">
                <div>
                  <h3 className="font-bold text-lg">Change password</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Leave blank to keep your current password.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="currentPw">Current password</Label>
                  <Input id="currentPw" type="password" value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="rounded-full" autoComplete="current-password" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newPw">New password</Label>
                  <Input id="newPw" type="password" value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="rounded-full" autoComplete="new-password" minLength={6} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPw">Confirm new password</Label>
                  <Input id="confirmPw" type="password" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="rounded-full" autoComplete="new-password" />
                </div>
              </Card>

              <Button type="submit" disabled={saving} className="w-full rounded-full bg-primary text-primary-foreground h-12 text-base">
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
