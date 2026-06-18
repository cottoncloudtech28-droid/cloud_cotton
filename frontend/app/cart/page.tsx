"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { placeOrder, getSavedAddresses, addSavedAddress, createRazorpayOrder, verifyRazorpayPayment } from "@/lib/api";
import type { Address, SavedAddress } from "@/lib/types";
import ProductCard from "@/components/shop/ProductCard";
import { getProducts } from "@/lib/api";
import { Trash2, ShoppingBag, CheckCircle2, MapPin, Package, Plus, Star, CreditCard, Truck } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand",
  "West Bengal","Andaman and Nicobar Islands","Chandigarh","Dadra & Nagar Haveli",
  "Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];

const EMPTY_ADDR: Address & { label: string } = {
  label: "Home", fullName: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "",
};

export default function CartPage() {
  const { items, setQty, remove, total, clear } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddrId, setSelectedAddrId] = useState<string | "new">("new");
  const [newAddr, setNewAddr] = useState(EMPTY_ADDR);
  const [saveNew, setSaveNew] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">("razorpay");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [featured, setFeatured] = useState<import("@/lib/types").Product[]>([]);

  // Load featured products for empty cart upsell
  useEffect(() => {
    if (items.length > 0) return;
    getProducts({ sort: "popular", limit: 4 })
      .then((data) => setFeatured(data.products ?? []))
      .catch(() => {});
  }, [items.length]);

  // Load Razorpay checkout script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  useEffect(() => {
    if (!user) return;
    setAddressesLoading(true);
    getSavedAddresses()
      .then((addrs) => {
        setSavedAddresses(addrs);
        const def = addrs.find((a) => a.isDefault) ?? addrs[0];
        if (def) setSelectedAddrId(def.id);
      })
      .catch(() => {})
      .finally(() => setAddressesLoading(false));
  }, [user]);

  const setNew = (k: keyof typeof newAddr, v: string) =>
    setNewAddr((a) => ({ ...a, [k]: v }));

  const activeAddr: Address | null =
    selectedAddrId === "new"
      ? newAddr
      : savedAddresses.find((a) => a.id === selectedAddrId) ?? null;

  const addrValid = activeAddr &&
    activeAddr.fullName.trim() && activeAddr.phone.trim() && activeAddr.line1.trim() &&
    activeAddr.city.trim() && activeAddr.state && activeAddr.pincode.trim();

  const handlePlace = async () => {
    if (!user) { router.push("/auth"); return; }
    if (!activeAddr || !addrValid) return;
    setError("");
    setPlacing(true);

    try {
      if (selectedAddrId === "new" && saveNew) {
        const updated = await addSavedAddress({ ...newAddr });
        setSavedAddresses(updated);
      }

      const orderItems = items.map(({ product: p, qty }) => ({
        productId: p.id, name: p.name, image_url: p.image_url ?? null,
        price: p.price, discount_percent: p.discount_percent, qty, color: null, size: null,
      }));

      if (paymentMethod === "cod") {
        const order = await placeOrder({ items: orderItems, address: activeAddr, total });
        setOrderId(order.orderId);
        clear();
        setPlacing(false);
      } else {
        // Razorpay flow: create order → open checkout → verify on success
        const rzpOrderData = await createRazorpayOrder(total);

        const options = {
          key: rzpOrderData.key_id,
          amount: rzpOrderData.amount,
          currency: rzpOrderData.currency,
          name: "Kawaii Corner Shop",
          description: `${items.length} item${items.length !== 1 ? "s" : ""}`,
          image: "/favicon.ico",
          order_id: rzpOrderData.razorpay_order_id,
          prefill: {
            name: activeAddr.fullName,
            contact: activeAddr.phone,
            email: user.email,
          },
          theme: { color: "#ec4899" },
          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) => {
            try {
              const order = await verifyRazorpayPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                items: orderItems,
                address: activeAddr,
                total,
              });
              setOrderId(order.orderId);
              clear();
            } catch (e: any) {
              setError(e.message || "Payment verification failed. Please contact support.");
            } finally {
              setPlacing(false);
            }
          },
          modal: {
            ondismiss: () => {
              setPlacing(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (response: any) => {
          setError(`Payment failed: ${response.error?.description || "Please try again."}`);
          setPlacing(false);
        });
        rzp.open();
        // placing(false) is handled in handler/ondismiss callbacks
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      setPlacing(false);
    }
  };

  /* ── Success ── */
  if (orderId) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container py-20">
          <div className="max-w-lg mx-auto text-center space-y-5">
            <div className="mx-auto h-20 w-20 grid place-items-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold">
              {paymentMethod === "razorpay" ? "Payment successful!" : "Order placed!"}
            </h1>
            <p className="text-muted-foreground">
              Your order <span className="font-semibold text-foreground">#{orderId}</span> has been received.
              {paymentMethod === "cod"
                ? " Pay when it arrives — we'll get it packed with love!"
                : " We'll get it packed and shipped soon!"}
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link href="/shop"><Button className="rounded-full bg-gradient-primary text-primary-foreground border-0">Keep shopping</Button></Link>
              <Link href="/profile"><Button variant="outline" className="rounded-full">View orders</Button></Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  /* ── Empty ── */
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container py-16 space-y-12">
          <div className="max-w-lg mx-auto text-center space-y-4">
            <div className="text-6xl">🛍️</div>
            <h1 className="text-3xl font-bold">Your cart is empty</h1>
            <p className="text-muted-foreground">Add some cuties to get started!</p>
            <Link href="/shop"><Button className="rounded-full bg-gradient-primary text-primary-foreground border-0 mt-2">Start shopping</Button></Link>
          </div>
          {featured.length > 0 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Most loved right now</h2>
                <Link href="/shop" className="text-sm text-primary font-medium hover:underline">See all →</Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {featured.map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
            </div>
          )}
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-8">
        <h1 className="text-4xl font-bold mb-8">Your cart</h1>

        <div className="grid lg:grid-cols-[1fr_400px] gap-8 items-start">

          {/* ── Left: cart items ── */}
          <div className="rounded-3xl bg-card shadow-soft p-5 space-y-3">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              {items.length} item{items.length !== 1 ? "s" : ""}
            </h2>

            <div className="space-y-2">
              {items.map(({ product: p, qty }) => {
                const final = +(p.price * (1 - p.discount_percent / 100)).toFixed(2);
                return (
                  <div key={p.id} className="flex items-center gap-4 p-3.5 rounded-2xl border border-border hover:border-primary/30 transition-colors">
                    <div className="h-18 w-18 rounded-xl overflow-hidden bg-gradient-hero shrink-0" style={{ width: 72, height: 72 }}>
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                        : <div className="h-full w-full grid place-items-center text-3xl">🌸</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-medium">₹{final}</span>
                        {p.discount_percent > 0 && (
                          <>
                            <span className="text-xs line-through text-muted-foreground">₹{p.price}</span>
                            <span className="text-xs text-green-600 font-medium">{p.discount_percent}% off</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Subtotal: ₹{(final * qty).toFixed(2)}</p>
                    </div>
                    <Input
                      type="number" min={1} value={qty}
                      onChange={(e) => setQty(p.id, parseInt(e.target.value) || 0)}
                      className="w-20 rounded-full text-center"
                    />
                    <Button variant="ghost" size="icon" onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-1">
              <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={clear}>
                Clear cart
              </Button>
            </div>
          </div>

          {/* ── Right: summary + address + payment ── */}
          <div className="space-y-5 lg:sticky lg:top-8">

            {/* Order summary */}
            <div className="rounded-3xl bg-card shadow-soft p-5 space-y-3">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-primary" /> Order summary
              </h2>
              <div className="divide-y divide-border text-sm">
                {items.map(({ product: p, qty }) => {
                  const final = +(p.price * (1 - p.discount_percent / 100)).toFixed(2);
                  return (
                    <div key={p.id} className="flex justify-between py-2">
                      <span className="text-muted-foreground truncate max-w-[200px]">{p.name} × {qty}</span>
                      <span className="font-medium shrink-0 ml-2">₹{(final * qty).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-border pt-3 flex justify-between font-bold text-base">
                <span>Total</span>
                <span>₹{total}</span>
              </div>
            </div>

            {/* Shipping address */}
            <div className="rounded-3xl bg-card shadow-soft p-5 space-y-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Shipping address
              </h2>

              {!user && (
                <p className="text-sm text-muted-foreground bg-accent/50 rounded-2xl p-3">
                  <Link href="/auth" className="text-primary font-semibold underline underline-offset-2">Sign in</Link>{" "}
                  to place your order.
                </p>
              )}

              {/* Saved addresses */}
              {addressesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-2xl" />
                  ))}
                </div>
              ) : savedAddresses.length > 0 && (
                <div className="space-y-2">
                  {savedAddresses.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setSelectedAddrId(a.id)}
                      className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all ${
                        selectedAddrId === a.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-primary">{a.label}</span>
                        {a.isDefault && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                            <Star className="h-2.5 w-2.5 fill-amber-400 stroke-amber-400" /> Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium">{a.fullName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} — {a.pincode}
                      </p>
                      <p className="text-xs text-muted-foreground">{a.phone}</p>
                    </button>
                  ))}

                  <button
                    onClick={() => setSelectedAddrId("new")}
                    className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all flex items-center gap-2 ${
                      selectedAddrId === "new"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <Plus className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Use a different address</span>
                  </button>
                </div>
              )}

              {/* New address form */}
              {selectedAddrId === "new" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="label">Label</Label>
                        <select
                          id="label"
                          value={newAddr.label}
                          onChange={(e) => setNew("label", e.target.value)}
                          className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {["Home", "Work", "Other"].map((l) => <option key={l}>{l}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" placeholder="98765 43210" value={newAddr.phone} onChange={(e) => setNew("phone", e.target.value)} className="rounded-xl" />
                      </div>
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="fullName">Full name</Label>
                      <Input id="fullName" placeholder="Anushka Sharma" value={newAddr.fullName} onChange={(e) => setNew("fullName", e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="line1">Address line 1</Label>
                      <Input id="line1" placeholder="House / flat / block no., street" value={newAddr.line1} onChange={(e) => setNew("line1", e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="line2">
                        Address line 2 <span className="text-muted-foreground font-normal">(optional)</span>
                      </Label>
                      <Input id="line2" placeholder="Landmark, area" value={newAddr.line2} onChange={(e) => setNew("line2", e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" placeholder="Mumbai" value={newAddr.city} onChange={(e) => setNew("city", e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pincode">Pincode</Label>
                      <Input id="pincode" placeholder="400001" maxLength={6} value={newAddr.pincode} onChange={(e) => setNew("pincode", e.target.value.replace(/\D/g, ""))} className="rounded-xl" />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="state">State</Label>
                      <select
                        id="state" value={newAddr.state} onChange={(e) => setNew("state", e.target.value)}
                        className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Select state</option>
                        {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  {user && (
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={saveNew}
                        onChange={(e) => setSaveNew(e.target.checked)}
                        className="rounded accent-primary"
                      />
                      Save this address to my account
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* Payment method */}
            <div className="rounded-3xl bg-card shadow-soft p-5 space-y-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> Payment method
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("razorpay")}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 text-center ${
                    paymentMethod === "razorpay"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <CreditCard className={`h-5 w-5 ${paymentMethod === "razorpay" ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-semibold">Pay Online</p>
                    <p className="text-[11px] text-muted-foreground">UPI · Cards · Netbanking</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cod")}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 text-center ${
                    paymentMethod === "cod"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <Truck className={`h-5 w-5 ${paymentMethod === "cod" ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-semibold">Cash on Delivery</p>
                    <p className="text-[11px] text-muted-foreground">Pay when it arrives</p>
                  </div>
                </button>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-2xl px-4 py-2">{error}</p>
              )}

              <Button
                className="w-full rounded-full bg-gradient-primary text-primary-foreground border-0 h-12 text-base font-semibold"
                disabled={!addrValid || !user || placing}
                onClick={handlePlace}
              >
                {placing
                  ? (paymentMethod === "razorpay" ? "Opening payment…" : "Placing order…")
                  : (paymentMethod === "razorpay" ? `Pay ₹${total}` : `Place order · ₹${total} (COD)`)}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By placing your order you agree to our{" "}
                <Link href="/shipping" className="underline underline-offset-2">shipping policy</Link>.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
