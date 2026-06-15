import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";

export default function ShippingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-12">
        <h1 className="text-4xl md:text-5xl font-extrabold uppercase bg-gradient-primary bg-clip-text text-transparent">
          Delivery &amp; Shipping
        </h1>
        <p className="text-muted-foreground mt-2">Everything you need to know about getting your order.</p>

        <div className="mt-8 space-y-6 text-foreground/90 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold mb-2">Processing time</h2>
            <p>Orders are packed and dispatched within 1-3 business days. Bulk and customised orders may take 5-7 business days.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-2">Delivery time</h2>
            <p>Standard delivery across India takes 3-7 business days after dispatch, depending on your location.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-2">Shipping charges</h2>
            <p>Flat ₹60 shipping on orders below ₹1000. Free shipping on all orders above ₹1000.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-2">Order tracking</h2>
            <p>Once dispatched, you&apos;ll receive a tracking link via email and SMS so you can follow your order to your doorstep.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-2">Need help?</h2>
            <p>Email <a className="text-primary font-medium" href="mailto:hello@cottoncloud.co">hello@cottoncloud.co</a> with your order number and we&apos;ll sort it out.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
