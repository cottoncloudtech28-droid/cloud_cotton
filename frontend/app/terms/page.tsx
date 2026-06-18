import type { Metadata } from "next";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";

export const metadata: Metadata = {
  title: "Terms & Conditions — Cotton Cloud Company",
  description: "Terms and conditions for shopping at Cotton Cloud Company.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-12 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-extrabold uppercase bg-gradient-primary bg-clip-text text-transparent">
          Terms &amp; Conditions
        </h1>
        <p className="text-muted-foreground mt-2">Last updated: June 2025</p>

        <div className="mt-8 space-y-8 text-foreground/90 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold mb-2">1. About us</h2>
            <p>Cotton Cloud Company (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is an e-commerce store selling kawaii stationery, toys, and lifestyle goods, operated from India. By placing an order or browsing our website you agree to these terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">2. Eligibility</h2>
            <p>You must be at least 13 years old to use this website. If you are under 18, you must have a parent or guardian&apos;s consent before making a purchase.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">3. Orders &amp; pricing</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>All prices are listed in Indian Rupees (₹) and are inclusive of applicable GST.</li>
              <li>We reserve the right to modify prices at any time without prior notice.</li>
              <li>An order is confirmed only after payment is successfully processed.</li>
              <li>We reserve the right to cancel any order in the event of pricing errors, fraud, or out-of-stock situations, with a full refund.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">4. Payment</h2>
            <p>We accept online payments via Razorpay (UPI, cards, net banking) and Cash on Delivery (COD). COD orders must be paid in full at the time of delivery. We do not store any card or banking details on our servers.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">5. Shipping &amp; delivery</h2>
            <p>Please refer to our <a href="/shipping" className="text-primary underline underline-offset-2">Shipping Policy</a> for timelines, carriers, and charges. Delivery timelines are estimates and not guaranteed. We are not liable for delays caused by the courier partner or factors beyond our control (weather, holidays, etc.).</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">6. Returns &amp; exchanges</h2>
            <p>Please refer to our <a href="/returns" className="text-primary underline underline-offset-2">Exchange Policy</a>. We offer exchanges within 3 days of delivery for unused items. We do not offer cash refunds except in cases where we are unable to fulfil your order.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">7. Intellectual property</h2>
            <p>All content on this website — including images, product descriptions, logos, and branding — is the exclusive property of Cotton Cloud Company. You may not reproduce, distribute, or use our content without written permission.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">8. Limitation of liability</h2>
            <p>To the maximum extent permitted by law, Cotton Cloud Company shall not be liable for any indirect, incidental, or consequential damages arising from your use of our website or products. Our total liability shall not exceed the amount paid for the order in question.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">9. Governing law</h2>
            <p>These terms are governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Maharashtra, India.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">10. Changes to these terms</h2>
            <p>We may update these terms at any time. The updated version will be posted on this page with a revised date. Continued use of our website after changes constitutes acceptance of the new terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">11. Contact</h2>
            <p>For any questions about these terms, email us at <a href="mailto:hello@cottoncloud.co" className="text-primary underline underline-offset-2">hello@cottoncloud.co</a>.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
