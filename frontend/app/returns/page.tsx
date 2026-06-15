import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";

export default function ReturnsPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-12">
        <h1 className="text-4xl md:text-5xl font-extrabold uppercase bg-gradient-primary bg-clip-text text-transparent">
          Exchange Policy
        </h1>
        <p className="text-muted-foreground mt-2">We want you to love your order. Here is how exchanges work.</p>

        <div className="mt-8 space-y-6 text-foreground/90 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold mb-2">3-day exchange window</h2>
            <p>You can request an exchange within 3 days of delivery for unused items in their original packaging. Just drop us an email with your order number and we will guide you through the rest.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-2">Exchanges only — no refunds</h2>
            <p>We do not offer refunds. If you are not happy with what you received, you can exchange it for another item. You will need to ship the product back to us, and once we receive and inspect it, we will send your replacement.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-2">Damaged on arrival</h2>
            <p>If you receive a damaged or defective product, you do not need to ship it back. We will send you a brand-new replacement right away. Please make sure you have an unboxing video of the product as proof, and share it with us within 48 hours of delivery.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-2">Non-exchangeable items</h2>
            <p>Customised products, gift-bulk orders and clearance items are not eligible for exchange.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-2">How to start an exchange</h2>
            <p>Email{" "}<a className="text-primary font-medium" href="mailto:hello@cottoncloud.co">hello@cottoncloud.co</a>{" "}with your order number, the reason for exchange, and your unboxing video (if the item is damaged). Our team will get back to you within 24 hours.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
