"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";
import { Button } from "@/components/ui/button";
import { XCircle, RefreshCcw, MessageCircle, ShieldCheck, Package } from "lucide-react";

function FailedContent() {
  const params = useSearchParams();
  const router = useRouter();
  const isNetworkIssue = params.get("network") === "1";
  const reason = params.get("reason") || "Your payment could not be processed. No money has been deducted.";

  return (
    <main className="flex-1 container py-20" style={{ maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
      <div className="rounded-3xl bg-card border border-red-100 p-8 sm:p-10 text-center space-y-5">

        {/* Icon */}
        <div className="mx-auto h-20 w-20 rounded-full bg-red-100 grid place-items-center">
          <XCircle className="h-10 w-10 text-red-500" />
        </div>

        {/* Heading */}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {isNetworkIssue ? "Couldn't confirm payment" : "Payment failed"}
          </h1>
          <p className="text-muted-foreground text-sm mt-2 leading-relaxed max-w-xs mx-auto">{reason}</p>
        </div>

        {/* Reassurance banner */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3.5 text-left flex items-start gap-3">
          <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-800 mb-0.5">
              {isNetworkIssue ? "If you were charged, don't worry" : "Your cart is safe"}
            </p>
            <p className="text-xs text-amber-700 leading-relaxed">
              {isNetworkIssue
                ? "Check My Orders in a few minutes — if the payment went through, your order will show up there. Otherwise it will be refunded automatically within 5–7 business days."
                : "No money was deducted. All your items are still in your cart — try again or switch to Cash on Delivery."}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5 pt-1">
          {isNetworkIssue && (
            <Link href="/profile">
              <Button variant="outline" className="w-full rounded-2xl h-12 gap-2 border-border text-sm">
                <Package className="h-4 w-4" /> Check my orders
              </Button>
            </Link>
          )}
          <Button
            className="w-full rounded-2xl h-12 bg-gradient-primary text-primary-foreground border-0 gap-2 text-sm font-semibold"
            onClick={() => router.push("/cart")}
          >
            <RefreshCcw className="h-4 w-4" /> {isNetworkIssue ? "Return to cart" : "Try again"}
          </Button>
          <Link href="/contact">
            <Button variant="outline" className="w-full rounded-2xl h-12 gap-2 border-border text-sm">
              <MessageCircle className="h-4 w-4" /> Contact support
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground pt-1">
          If money was deducted, it will be refunded automatically within 5–7 business days.
        </p>
      </div>
    </main>
  );
}

export default function PaymentFailedPage() {
  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Navbar />
      <Suspense fallback={
        <main className="flex-1 flex items-center justify-center">
          <div className="h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </main>
      }>
        <FailedContent />
      </Suspense>
      <Footer />
    </div>
  );
}
