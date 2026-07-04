"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { placeOrder, getSavedAddresses, addSavedAddress, createRazorpayOrder, verifyRazorpayPayment, getShippingRate, getPaymentSettings } from "@/lib/api";
import type { CourierOption, ShippingRateResult } from "@/lib/api";
import type { Address, SavedAddress } from "@/lib/types";
import ProductCard from "@/components/shop/ProductCard";
import { getProducts } from "@/lib/api";
import { Trash2, ShoppingBag, MapPin, Package, Plus, Star, CreditCard, Truck, ChevronDown, ChevronUp, ImageOff } from "lucide-react";
import { toast } from "sonner";

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

function RazorpayLogo({ height = 22, white = false }: { height?: number; white?: boolean }) {
  return (
    <img
      src="/razorpay.png"
      alt="Razorpay"
      height={height}
      style={{ height, width: "auto", objectFit: "contain", filter: white ? "brightness(0) invert(1)" : undefined }}
    />
  );
}

export default function CartPage() {
  const { items, setQty, remove, add, total, clear, hydrated } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddrId, setSelectedAddrId] = useState<string | "new">("new");
  const [newAddr, setNewAddr] = useState(EMPTY_ADDR);
  const [saveNew, setSaveNew] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">("razorpay");
  const [codEnabled, setCodEnabled] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [featured, setFeatured] = useState<import("@/lib/types").Product[]>([]);
  const [recommendations, setRecommendations] = useState<import("@/lib/types").Product[]>([]);

  const [shippingResult, setShippingResult] = useState<ShippingRateResult | null>(null);
  const [selectedCourier, setSelectedCourier] = useState<CourierOption | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [showCourierPicker, setShowCourierPicker] = useState(false);
  const [quickPincode, setQuickPincode] = useState("");

  const addressRef = useRef<HTMLDivElement>(null);
  const quickPincodeRedirected = useRef(false);

  const FREE_THRESHOLD = 1499;

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (hydrated && !user) {
      router.replace(`/auth?redirect=${encodeURIComponent("/cart")}`);
    }
  }, [hydrated, user, router]);

  // Load featured products for empty cart upsell
  useEffect(() => {
    if (items.length > 0) return;
    getProducts({ sort: "popular", limit: 4 })
      .then((data) => setFeatured(data.products ?? []))
      .catch(() => {});
  }, [items.length]);

  // Load recommendations based on cart categories
  useEffect(() => {
    if (items.length === 0) { setRecommendations([]); return; }
    const cartIds = new Set(items.map((i) => i.product.id.split("::")[0]));
    // Pick the most frequent category in the cart
    const catCounts: Record<string, number> = {};
    for (const { product } of items) {
      catCounts[product.category] = (catCounts[product.category] ?? 0) + 1;
    }
    const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0][0];
    getProducts({ cat: topCat, sort: "popular", limit: 8 })
      .then((data) => {
        const filtered = (data.products ?? []).filter((p) => !cartIds.has(p.id)).slice(0, 4);
        setRecommendations(filtered);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => i.product.id).join(",")]);

  // Load Razorpay checkout script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  useEffect(() => {
    getPaymentSettings()
      .then((s) => {
        const enabled = s.cod_enabled ?? true;
        setCodEnabled(enabled);
        if (!enabled) setPaymentMethod("razorpay");
      })
      .catch(() => {});
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

  const activeAddr: Address | null =
    selectedAddrId === "new"
      ? newAddr
      : savedAddresses.find((a) => a.id === selectedAddrId) ?? null;

  const addrValid = activeAddr &&
    activeAddr.fullName.trim() && activeAddr.phone.trim() && activeAddr.line1.trim() &&
    activeAddr.city.trim() && activeAddr.state && activeAddr.pincode.trim();

  // Scroll the address card into view and focus its first empty required field,
  // so a user who taps "Pay" without an address is shown exactly what to fill.
  const focusAddress = (prefillPincode?: string) => {
    // No saved address selected? open the new-address form so fields are visible.
    if (selectedAddrId !== "new" && !savedAddresses.some((a) => a.id === selectedAddrId)) {
      setSelectedAddrId("new");
    }
    if (savedAddresses.length === 0) setSelectedAddrId("new");
    if (prefillPincode && /^\d{6}$/.test(prefillPincode)) {
      setSelectedAddrId("new");
      setNewAddr((a) => ({ ...a, pincode: prefillPincode }));
    }
    addressRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      const card = addressRef.current;
      if (!card) return;
      const fields = card.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select");
      for (const f of Array.from(fields)) {
        if (f.id === "line2" || f.id === "label") continue; // optional / pre-filled
        if (!f.value.trim()) { f.focus(); break; }
      }
    }, 450);
  };

  // Single entry point for the Pay / Place-order buttons: route the user to the
  // address form when it's incomplete instead of leaving a dead disabled button.
  const handlePayClick = () => {
    if (!user) { router.push(`/auth?redirect=${encodeURIComponent("/cart")}`); return; }
    if (!addrValid) { focusAddress(); return; }
    handlePlace();
  };

  // Fetch shipping rate whenever pincode or payment method changes
  useEffect(() => {
    const addrPincode = activeAddr?.pincode?.trim() ?? "";
    const pincode = /^\d{6}$/.test(addrPincode) ? addrPincode : quickPincode;
    if (!/^\d{6}$/.test(pincode)) {
      setShippingResult(null);
      setSelectedCourier(null);
      return;
    }
    if (total >= FREE_THRESHOLD) {
      setShippingResult({ serviceable: true, free_shipping: true, recommended: null, options: [] });
      setSelectedCourier(null);
      return;
    }
    const isCod = paymentMethod === "cod";
    const totalQty = items.reduce((s, { qty }) => s + qty, 0);
    const estimatedWeight = +(0.5 * totalQty).toFixed(2);
    setShippingLoading(true);
    const t = setTimeout(() => {
      getShippingRate(pincode, estimatedWeight, isCod)
        .then((r) => {
          setShippingResult(r);
          setSelectedCourier(r.recommended ?? r.options[0] ?? null);
        })
        .catch(() => {
          const fallback: CourierOption = {
            courier_id: null, courier_name: null,
            freight_charge: 60, cod_charge: isCod ? 30 : 0,
            total_charge: isCod ? 90 : 60,
            estimated_days: 5, etd: null, is_recommended: true, rating: null,
          };
          setShippingResult({ serviceable: true, recommended: fallback, options: [fallback] });
          setSelectedCourier(fallback);
        })
        .finally(() => setShippingLoading(false));
    }, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAddr?.pincode, quickPincode, paymentMethod, total]);

  const setNew = (k: keyof typeof newAddr, v: string) =>
    setNewAddr((a) => ({ ...a, [k]: v }));

  const handleSaveAddressNow = async () => {
    const { fullName, phone, line1, city, state, pincode } = newAddr;
    if (!fullName || !phone || !line1 || !city || !state || !pincode) {
      toast.error("Please fill all required address fields before saving");
      return;
    }
    setSavingAddr(true);
    try {
      const updated = await addSavedAddress({ ...newAddr });
      setSavedAddresses(updated);
      const saved = updated[updated.length - 1];
      if (saved) setSelectedAddrId(saved.id);
      setSaveNew(false);
      toast.success("Address saved!");
    } catch (e: any) {
      toast.error(e.message || "Could not save address");
    } finally {
      setSavingAddr(false);
    }
  };

  const isFreeShipping = shippingResult?.free_shipping || total >= FREE_THRESHOLD;
  const resolvedShipping = isFreeShipping ? 0 : (selectedCourier?.total_charge ?? 0);
  const grandTotal = total + resolvedShipping;

  // GST estimate (prices are inclusive; back-calculate taxable value)
  const gstEstimate = (() => {
    let taxable = 0;
    let totalTax = 0;
    for (const { product: p, qty } of items) {
      const rate = p.gst_rate ?? 12;
      const finalPrice = +(p.price * (1 - p.discount_percent / 100)).toFixed(2);
      const lineTotal = +(finalPrice * qty).toFixed(2);
      const txbl = +(lineTotal / (1 + rate / 100)).toFixed(2);
      taxable += txbl;
      totalTax += +(lineTotal - txbl).toFixed(2);
    }
    return { taxable: +taxable.toFixed(2), tax: +totalTax.toFixed(2) };
  })();

  const handlePlace = async () => {
    if (!user) { router.push("/auth"); return; }
    if (!activeAddr || !addrValid) return;
    setError("");
    setPlacing(true);

    try {
      const orderItems = items.map(({ product: p, qty }) => ({
        productId: p.id, name: p.name, image_url: p.image_url ?? null,
        price: p.price, discount_percent: p.discount_percent, qty, color: null, size: null,
      }));

      if (paymentMethod === "cod") {
        const order = await placeOrder({ items: orderItems, address: activeAddr, total: grandTotal, shipping_charge: resolvedShipping });
        clear();
        router.push(`/order/${order.id}`);
      } else {
        // Razorpay flow: create order → open checkout → verify on success
        const rzpOrderData = await createRazorpayOrder(grandTotal);

        const options = {
          key: rzpOrderData.key_id,
          amount: rzpOrderData.amount,
          currency: rzpOrderData.currency,
          name: "Cotton Cloud Company",
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
                total: grandTotal,
                shipping_charge: resolvedShipping,
              });
              clear();
              router.push(`/order/${order.id}`);
            } catch (e: any) {
              setPlacing(false);
              router.push(`/order/failed?reason=${encodeURIComponent(e.message || "Payment verification failed. Please contact support.")}`);
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
          setPlacing(false);
          router.push(`/order/failed?reason=${encodeURIComponent(response.error?.description || "Payment could not be processed. Please try again.")}`);
        });
        rzp.open();
        // placing(false) is handled in handler/ondismiss/failed callbacks
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      setPlacing(false);
    }
  };

  /* ── Loading (waiting for localStorage hydration) ── */
  if (!hydrated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container py-8 space-y-6">
          <Skeleton className="h-10 w-48 rounded" />
          <div className="grid lg:grid-cols-[1fr_400px] gap-8">
            <Skeleton className="h-64 rounded-3xl" />
            <div className="space-y-4">
              <Skeleton className="h-48 rounded-3xl" />
              <Skeleton className="h-40 rounded-3xl" />
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
        {/* ── Top quick-pay bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl sm:text-4xl font-bold">Your cart</h1>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""} · ₹{grandTotal}</p>
              {!addrValid
                ? <p className="text-xs text-amber-600 font-medium">Fill address to pay</p>
                : isFreeShipping
                  ? <p className="text-xs text-green-600 font-medium">Free shipping</p>
                  : resolvedShipping > 0
                    ? <p className="text-xs text-muted-foreground">+₹{resolvedShipping} shipping</p>
                    : <p className="text-xs text-muted-foreground">Add address for shipping</p>
              }
            </div>
            {!addrValid ? (
              <Button
                onClick={() => handlePayClick()}
                className="rounded-full h-10 px-5 font-semibold text-sm shadow-sm gap-1.5 bg-amber-500 hover:bg-amber-600 text-white border-0"
              >
                <MapPin className="h-4 w-4" />
                Add delivery address
              </Button>
            ) : paymentMethod === "razorpay" ? (
              <button
                disabled={placing}
                onClick={() => handlePayClick()}
                className="rounded-full h-10 px-5 font-semibold text-sm shadow-sm flex items-center gap-2 transition-opacity disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #3395FF 0%, #1a6fd4 100%)", color: "white", border: "none" }}
              >
                {placing ? "Opening…" : (
                  <>
                    Pay ₹{grandTotal}
                    <span className="h-4 w-px bg-white/30 mx-0.5" />
                    <RazorpayLogo height={15} white />
                  </>
                )}
              </button>
            ) : (
              <Button
                className="rounded-full bg-gradient-primary text-primary-foreground border-0 h-10 px-6 font-semibold text-sm shadow-sm"
                disabled={placing}
                onClick={() => handlePayClick()}
              >
                {placing ? "Placing…" : `Place order · ₹${grandTotal}`}
              </Button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-8 items-start">

          {/* ── Left: cart items ── */}
          <div className="rounded-3xl bg-card p-5 space-y-3">
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
                        : <div className="h-full w-full flex items-center justify-center bg-muted"><ImageOff className="h-6 w-6 text-muted-foreground/25" /></div>}
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

            {/* ── Inline recommendations ── */}
            {recommendations.length > 0 && (
              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-primary fill-primary" /> You might also like
                </p>
                <div className="flex gap-3 overflow-x-auto pb-1 snap-x scrollbar-none">
                  {recommendations.map((p) => {
                    const final = +(p.price * (1 - p.discount_percent / 100)).toFixed(2);
                    return (
                      <div key={p.id} className="shrink-0 snap-start w-36 border border-border rounded-2xl overflow-hidden bg-background hover:border-primary/40 transition-colors">
                        <Link href={`/product/${p.slug ?? p.id}`}>
                          <div className="aspect-square bg-gradient-hero overflow-hidden">
                            {p.image_url
                              ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                              : <div className="flex items-center justify-center h-full bg-muted"><ImageOff className="h-5 w-5 text-muted-foreground/25" /></div>}
                          </div>
                        </Link>
                        <div className="p-2.5 space-y-1.5">
                          <p className="text-xs font-medium line-clamp-2 leading-tight">{p.name}</p>
                          <p className="text-xs font-bold">₹{final}</p>
                          <Button
                            size="sm"
                            disabled={p.stock === 0}
                            onClick={(e) => {
                              e.preventDefault();
                              if (!user) { toast.error("Please sign in to add items"); router.push("/auth"); return; }
                              add(p);
                              toast.success(`${p.name} added to cart`);
                            }}
                            className="w-full h-7 text-xs rounded-full bg-gradient-primary text-primary-foreground border-0 px-2"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {p.stock === 0 ? "Sold out" : "Add"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: summary + address + payment ── */}
          <div className="space-y-5 lg:sticky lg:top-8">

            {/* Order summary */}
            <div className="rounded-3xl bg-card p-5 space-y-3">
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

              {/* Subtotal */}
              <div className="flex justify-between text-sm pt-2">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{total}</span>
              </div>

              {/* Shipping */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>
                    {shippingLoading ? (
                      <span className="text-xs text-muted-foreground animate-pulse">Calculating…</span>
                    ) : shippingResult === null ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={quickPincode}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                          setQuickPincode(v);
                          // Once a full pincode is entered here, guide the user into
                          // the address form (prefilling the pincode) so they actually
                          // complete the address rather than stopping at the estimate.
                          if (/^\d{6}$/.test(v) && !addrValid && !quickPincodeRedirected.current) {
                            quickPincodeRedirected.current = true;
                            focusAddress(v);
                          }
                          if (v.length < 6) quickPincodeRedirected.current = false;
                        }}
                        placeholder="Enter pincode"
                        maxLength={6}
                        className="h-7 w-28 rounded-lg border border-input bg-background px-2 text-xs text-right focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    ) : isFreeShipping ? (
                      <span className="text-green-600 font-semibold text-sm">FREE</span>
                    ) : selectedCourier ? (
                      <span className="font-medium">₹{resolvedShipping}</span>
                    ) : null}
                  </span>
                </div>

                {/* Courier detail + picker */}
                {!isFreeShipping && selectedCourier && !shippingLoading && (
                  <div className="bg-muted/50 rounded-xl p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold flex items-center gap-1.5">
                          {selectedCourier.estimated_days
                            ? `Delivery in ${selectedCourier.estimated_days} day${selectedCourier.estimated_days !== 1 ? "s" : ""}`
                            : "Standard Delivery"}
                          {selectedCourier.is_recommended && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Recommended</span>
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {selectedCourier.etd
                            ? `Expected by ${new Date(selectedCourier.etd).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                            : "Estimated delivery time"}
                          {selectedCourier.cod_charge > 0 && ` · COD charge ₹${selectedCourier.cod_charge}`}
                        </p>
                      </div>
                      {(shippingResult?.options?.length ?? 0) > 1 && (
                        <button
                          onClick={() => setShowCourierPicker((v) => !v)}
                          className="text-xs text-primary flex items-center gap-0.5 shrink-0 ml-2"
                        >
                          Change {showCourierPicker ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      )}
                    </div>

                    {/* Delivery options — deduplicated by day, cheapest per group */}
                    {showCourierPicker && (() => {
                      const seen = new Map<number | null, CourierOption>();
                      for (const opt of shippingResult?.options ?? []) {
                        const key = opt.estimated_days ?? null;
                        const existing = seen.get(key);
                        if (!existing || opt.total_charge < existing.total_charge || opt.is_recommended)
                          seen.set(key, opt);
                      }
                      const deduped = Array.from(seen.values()).sort((a, b) => (a.total_charge) - (b.total_charge));
                      return (
                        <div className="border-t border-border pt-1.5 space-y-1">
                          {deduped.map((opt, i) => (
                            <button
                              key={opt.courier_id ?? i}
                              onClick={() => { setSelectedCourier(opt); setShowCourierPicker(false); }}
                              className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${
                                selectedCourier?.courier_id === opt.courier_id
                                  ? "bg-primary/10 text-primary font-semibold"
                                  : "hover:bg-muted"
                              }`}
                            >
                              <span>
                                {opt.estimated_days ? `${opt.estimated_days} day${opt.estimated_days !== 1 ? "s" : ""} delivery` : "Standard delivery"}
                                {opt.is_recommended && <span className="ml-1 text-primary/70"> (Recommended)</span>}
                              </span>
                              <span className="font-semibold ml-2">₹{opt.total_charge}</span>
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Free shipping nudge */}
                {!isFreeShipping && shippingResult && resolvedShipping > 0 && total < FREE_THRESHOLD && (
                  <p className="text-xs text-primary font-medium">
                    Add ₹{(FREE_THRESHOLD - total).toFixed(0)} more for FREE shipping
                  </p>
                )}
              </div>

              {/* GST breakdown (informational; prices are inclusive) */}
              <div className="bg-muted/40 rounded-xl px-3 py-2.5 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Taxable value</span>
                  <span>₹{gstEstimate.taxable.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (incl. in price)</span>
                  <span>₹{gstEstimate.tax.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground/70 pt-0.5">All prices are GST-inclusive. Tax invoice will be issued after order.</p>
              </div>

              <div className="border-t border-border pt-3 flex justify-between font-bold text-base">
                <span>Total</span>
                <span>₹{grandTotal}</span>
              </div>
            </div>

            {/* Shipping address */}
            <div ref={addressRef} className={`rounded-3xl bg-card p-5 space-y-4 transition-all scroll-mt-24 ${!addrValid ? "ring-2 ring-amber-400/60" : ""}`}>
              <h2 className="font-bold text-lg flex items-center gap-2">
                <MapPin className={`h-4 w-4 ${!addrValid ? "text-amber-500" : "text-primary"}`} /> Shipping address
                {!addrValid && (
                  <span className="ml-auto text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Required
                  </span>
                )}
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full rounded-xl h-9 text-sm gap-1.5"
                      disabled={savingAddr}
                      onClick={handleSaveAddressNow}
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      {savingAddr ? "Saving…" : "Save this address to my account"}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Payment method */}
            <div className="rounded-3xl bg-card p-5 space-y-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> Payment method
              </h2>
              <div className={`grid gap-3 ${codEnabled ? "grid-cols-2" : "grid-cols-1"}`}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("razorpay")}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 text-center ${
                    paymentMethod === "razorpay"
                      ? "border-[#3395FF] bg-[#3395FF]/8"
                      : "border-border hover:border-[#3395FF]/40"
                  }`}
                >
                  <div className={`rounded-xl px-3 py-1.5 ${paymentMethod === "razorpay" ? "bg-[#3395FF]/10" : "bg-muted"}`}>
                    <RazorpayLogo height={20} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Razorpay</p>
                    <p className="text-[10px] text-muted-foreground">UPI · Cards · Netbanking</p>
                  </div>
                </button>
                {codEnabled && (
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
                )}
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-2xl px-4 py-2">{error}</p>
              )}

              {!addrValid && (
                <button
                  type="button"
                  onClick={() => focusAddress()}
                  className="w-full text-left rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2.5 hover:bg-amber-100 transition-colors"
                >
                  <MapPin className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Shipping address required</p>
                    <p className="text-xs text-amber-700 mt-0.5">Tap here to fill in your delivery address and continue.</p>
                  </div>
                </button>
              )}

              {!addrValid ? (
                <Button
                  onClick={() => handlePayClick()}
                  className="w-full rounded-2xl h-14 text-base font-semibold gap-2 bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-md"
                >
                  <MapPin className="h-5 w-5" />
                  Add delivery address to continue
                </Button>
              ) : paymentMethod === "razorpay" ? (
                <button
                  disabled={placing}
                  onClick={() => handlePayClick()}
                  className="w-full rounded-2xl overflow-hidden transition-opacity disabled:opacity-50 shadow-md"
                  style={{ background: "linear-gradient(135deg, #3395FF 0%, #1a6fd4 100%)", color: "white", border: "none" }}
                >
                  {placing ? (
                    <div className="h-14 flex items-center justify-center gap-2 text-sm font-semibold">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Opening payment…
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-3 gap-1">
                      <span className="text-base font-bold tracking-tight">Pay ₹{grandTotal}</span>
                      <div className="flex items-center gap-1.5 opacity-80">
                        <span className="text-[11px]">Powered by</span>
                        <RazorpayLogo height={15} white />
                      </div>
                    </div>
                  )}
                </button>
              ) : (
                <Button
                  className="w-full rounded-full bg-gradient-primary text-primary-foreground border-0 h-12 text-base font-semibold"
                  disabled={placing}
                  onClick={() => handlePayClick()}
                >
                  {placing ? "Placing order…" : `Place order · ₹${grandTotal} (COD)`}
                </Button>
              )}

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
