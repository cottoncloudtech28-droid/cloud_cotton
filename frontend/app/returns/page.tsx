import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";

export const metadata: Metadata = {
  title: "Returns & Refunds — Cotton Cloud Company",
};

export default function ReturnsPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-12 max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-extrabold uppercase bg-gradient-primary bg-clip-text text-transparent">
          Returns &amp; Refunds
        </h1>

        <div className="mt-8 p-6 rounded-3xl bg-muted border border-border text-foreground/80 leading-relaxed space-y-3">
          <p className="text-base font-semibold text-foreground">
            Returns and refunds are currently not available.
          </p>
          <p className="text-sm">
            We are working on our returns and refund policy. Please reach out to us directly if you received a damaged or incorrect item — we will make it right.
          </p>
          <p className="text-sm">
            Contact us at{" "}
            <a href="mailto:hello@cottoncloud.co" className="text-primary font-medium underline underline-offset-2">
              hello@cottoncloud.co
            </a>{" "}
            with your order number and a photo of the issue.
          </p>
        </div>

        <div className="mt-6 text-sm text-muted-foreground">
          <p>For shipping information, see our <Link href="/shipping" className="text-primary underline underline-offset-2">Delivery &amp; Shipping</Link> page.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
