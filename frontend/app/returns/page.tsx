import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";

export const metadata: Metadata = {
  title: "Returns & Refunds — Cotton Cloud Company",
};

export default function ReturnsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="container py-12 max-w-2xl flex-1">
        <h1 className="text-4xl md:text-5xl font-extrabold uppercase bg-gradient-primary bg-clip-text text-transparent">
          Returns &amp; Refunds
        </h1>

        <div className="mt-8 p-6 rounded-3xl bg-muted border border-border text-foreground/80 leading-relaxed space-y-3">
          <p className="text-base font-semibold text-foreground">
            Returns and refunds are currently not available.
          </p>
          <p className="text-sm">
            We are working on our returns and refund policy. Please reach out to us directly if
            you received a damaged or incorrect item — we will make it right.
          </p>
          <p className="text-sm">
            Contact us at{" "}
            <a href="mailto:hello@cottoncloud.co" className="text-primary font-medium underline underline-offset-2">
              hello@cottoncloud.co
            </a>{" "}
            with your order number and a photo of the issue.
          </p>
        </div>

        <div className="mt-6 p-6 rounded-3xl bg-muted border border-border text-foreground/80 leading-relaxed space-y-3">
          <p className="text-base font-semibold text-foreground">
            Replacements &amp; Refunds:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>
              If a product is received and is in defective condition (Dead On Arrival) or damaged,
              the product will be replaced with a new product. The product has to be shipped back
              to Cotton Cloud Company with all original packing and accessories with no damage to
              serial numbers.
            </li>
            <li>
              Once the product is received, we will dispatch your product on the same day. It is
              highly recommended to make a full unboxing video of the product. Inform us
              immediately when you receive any defective or damaged goods when you receive them.
            </li>
          </ul>
        </div>

        <div className="mt-6 p-6 rounded-3xl bg-muted border border-border text-foreground/80 leading-relaxed space-y-3">
          <p className="text-base font-semibold text-foreground">
            Return and Refund policy will not be valid for the below reasons:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>If you don't have an unboxing Video from start to end.</li>
            <li>If you don't email us your full video for any claim within 2 days after the product has been delivered.</li>
          </ul>
        </div>

        <div className="mt-6 text-sm text-muted-foreground">
          <p>For shipping information, see our <Link href="/shipping" className="text-primary underline underline-offset-2">Delivery &amp; Shipping</Link> page.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
