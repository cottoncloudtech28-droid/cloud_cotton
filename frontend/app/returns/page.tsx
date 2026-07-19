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

        <p className="mt-6 text-foreground/80 leading-relaxed">
          We want every order to reach you picture-perfect. If something isn't right, here's how
          returns, replacements and refunds work — please read carefully so we can sort it out for
          you quickly. 💕
        </p>

        <div className="mt-8 p-6 rounded-3xl bg-muted border border-border text-foreground/80 leading-relaxed space-y-3">
          <p className="text-base font-semibold text-foreground">
            A return or refund will not be valid for the reasons below:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>
              You don't have an unboxing video recorded continuously from the very start to the
              end of opening the parcel.
            </li>
            <li>
              You don't email us your complete unboxing video for any claim within 2 days of the
              product being delivered.
            </li>
          </ul>
        </div>

        <div className="mt-6 p-6 rounded-3xl bg-muted border border-border text-foreground/80 leading-relaxed space-y-3">
          <p className="text-base font-semibold text-foreground">
            Replacements &amp; refunds
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>
              If a product arrives defective (Dead on Arrival) or damaged, we'll replace it with a
              brand-new one. The item must be shipped back to Cotton Cloud Company with all original
              packaging and accessories, and with no damage to any serial numbers.
            </li>
            <li>
              Once we receive the returned product, we dispatch your replacement the same day. We
              strongly recommend making a full unboxing video, and please inform us immediately when
              you receive any defective or damaged goods.
            </li>
          </ul>
        </div>

        <div className="mt-6 p-6 rounded-3xl bg-muted border border-border text-foreground/80 leading-relaxed">
          <p className="text-sm">
            To raise a claim, email us at{" "}
            <a href="mailto:hello@cottoncloud.co" className="text-primary font-medium underline underline-offset-2">
              hello@cottoncloud.co
            </a>{" "}
            with your order number and your full unboxing video within 2 days of delivery.
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
