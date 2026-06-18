import type { Metadata } from "next";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy — Cotton Cloud Company",
  description: "How Cotton Cloud Company collects, uses, and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-12 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-extrabold uppercase bg-gradient-primary bg-clip-text text-transparent">
          Privacy Policy
        </h1>
        <p className="text-muted-foreground mt-2">Last updated: June 2025 · Compliant with the IT Act 2000 &amp; DPDP Act 2023</p>

        <div className="mt-8 space-y-8 text-foreground/90 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold mb-2">1. Who we are</h2>
            <p>Cotton Cloud Company is an Indian e-commerce business. This policy explains how we collect, use, and protect your personal data when you visit our website or make a purchase. For any privacy-related enquiries, contact us at <a href="mailto:hello@cottoncloud.co" className="text-primary underline underline-offset-2">hello@cottoncloud.co</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">2. Data we collect</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>Account data:</strong> email address, name, and password (stored as a salted hash — we never store your plain-text password).</li>
              <li><strong>Order data:</strong> shipping address, phone number, items ordered, and payment method.</li>
              <li><strong>Payment data:</strong> transactions are processed by Razorpay. We do not store card numbers or banking credentials on our servers.</li>
              <li><strong>Usage data:</strong> pages visited, search queries, and cart/wishlist activity to improve your experience.</li>
              <li><strong>Contact form:</strong> your name, email, and message when you write to us.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">3. How we use your data</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>To process and fulfil your orders.</li>
              <li>To send order confirmations and shipping updates.</li>
              <li>To respond to your support queries.</li>
              <li>To improve our website and product offerings.</li>
              <li>To comply with legal obligations.</li>
            </ul>
            <p className="mt-2 text-sm">We do <strong>not</strong> sell or rent your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">4. Legal basis for processing</h2>
            <p>Under the Digital Personal Data Protection Act 2023 (DPDP Act), we process your data on the basis of:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
              <li><strong>Contract performance:</strong> to fulfil orders you place with us.</li>
              <li><strong>Legitimate interest:</strong> to prevent fraud and improve our services.</li>
              <li><strong>Legal obligation:</strong> to comply with Indian tax and consumer protection laws.</li>
              <li><strong>Consent:</strong> for marketing communications (you may opt out at any time).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">5. Data retention</h2>
            <p>We retain your account and order data for as long as your account is active or as required by law (typically 7 years for financial records under the Companies Act). You may request deletion of your account by emailing us.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">6. Third-party services</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><strong>Razorpay:</strong> processes payments. Subject to <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Razorpay&apos;s Privacy Policy</a>.</li>
              <li><strong>Shipping couriers:</strong> receive your name, address, and phone to deliver your order.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">7. Cookies</h2>
            <p>We use essential cookies to keep you signed in and maintain your cart session. We do not use advertising or tracking cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">8. Your rights</h2>
            <p>Under the DPDP Act 2023, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
              <li>Access the personal data we hold about you.</li>
              <li>Correct inaccurate data.</li>
              <li>Erase your data (subject to legal retention obligations).</li>
              <li>Withdraw consent for marketing at any time.</li>
              <li>Raise a grievance with our Grievance Officer.</li>
            </ul>
            <p className="mt-2 text-sm">To exercise any of these rights, email <a href="mailto:hello@cottoncloud.co" className="text-primary underline underline-offset-2">hello@cottoncloud.co</a>. We will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">9. Data security</h2>
            <p>We use industry-standard security measures including HTTPS encryption, hashed passwords (bcrypt), and JWT-based authentication. While we take every precaution, no method of transmission over the internet is 100% secure.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">10. Children&apos;s privacy</h2>
            <p>Our services are not directed at children under 13. We do not knowingly collect personal data from children under 13. If you believe we have inadvertently collected such data, please contact us immediately.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">11. Grievance Officer</h2>
            <p>In accordance with the IT Act 2000 and rules thereunder, the name and contact details of our Grievance Officer are:</p>
            <div className="mt-2 p-4 rounded-2xl bg-muted text-sm space-y-1">
              <p><strong>Name:</strong> Cotton Cloud Company</p>
              <p><strong>Email:</strong> <a href="mailto:hello@cottoncloud.co" className="text-primary underline underline-offset-2">hello@cottoncloud.co</a></p>
              <p><strong>Response time:</strong> Within 30 days of receipt of grievance</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">12. Changes to this policy</h2>
            <p>We may update this policy from time to time. We will notify you of significant changes by email or a prominent notice on our website. The updated policy will be effective from the date of posting.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
