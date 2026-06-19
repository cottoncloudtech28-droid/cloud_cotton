import type { Metadata } from "next";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";

export const metadata: Metadata = {
  title: "Delivery & Shipping — Cotton Cloud Company",
  description: "Shipping charges, delivery timelines, and order tracking information for Cotton Cloud Company.",
};

export default function ShippingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-12 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-extrabold uppercase bg-gradient-primary bg-clip-text text-transparent">
          Delivery &amp; Shipping
        </h1>
        <p className="text-muted-foreground mt-2">Everything you need to know about getting your order.</p>

        <div className="mt-8 space-y-6 text-foreground/90 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold mb-2">Shipping charges</h2>
            <div className="overflow-hidden rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Order value</th>
                    <th className="text-left px-4 py-3 font-semibold">Shipping fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="bg-card">
                    <td className="px-4 py-3">Below ₹1,499</td>
                    <td className="px-4 py-3">Standard shipping charges apply</td>
                  </tr>
                  <tr className="bg-green-50">
                    <td className="px-4 py-3 font-semibold text-green-700">₹1,499 and above</td>
                    <td className="px-4 py-3 font-semibold text-green-700">FREE delivery 🎉</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Processing time</h2>
            <p>Orders are packed and dispatched within 1–3 business days. Bulk and customised orders may take 5–7 business days.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Delivery time</h2>
            <p>Standard delivery across India takes 3–7 business days after dispatch, depending on your location.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Order tracking</h2>
            <p>Once dispatched, you&apos;ll receive a tracking link via email and SMS so you can follow your order to your doorstep. You can also track your order anytime at <a href="/track-order" className="text-primary underline underline-offset-2">Track Order</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Need help?</h2>
            <p>Email <a className="text-primary font-medium underline underline-offset-2" href="mailto:hello@cottoncloud.co">hello@cottoncloud.co</a> with your order number and we&apos;ll sort it out.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
