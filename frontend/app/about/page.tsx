import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";
import { Cloud, Heart, Sparkles } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-12">
        <div className="text-center mb-10">
          <Cloud className="mx-auto h-12 w-12 text-primary fill-primary/20" />
          <h1 className="text-4xl md:text-5xl font-extrabold uppercase mt-4 bg-gradient-primary bg-clip-text text-transparent">
            About us
          </h1>
          <p className="text-muted-foreground mt-2">A little story about our happy little cloud</p>
        </div>
        <div className="space-y-5 text-base leading-relaxed text-foreground/90">
          <p>
            Cotton Cloud Company started as a tiny daydream — a wish to fill desks, shelves and gift bags with
            things that make people smile. We curate kawaii stationery, quirky knick-knacks, soft toys, lamps,
            bottles, lunch boxes and more, all hand-picked for their charm.
          </p>
          <p>
            Every order is wrapped like a gift because we believe unboxing should feel like a hug. Our promise is
            simple: thoughtful curation, cozy packaging, and a sprinkle of joy in every parcel.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 mt-10">
          {[
            { I: Heart, t: "Curated with love" },
            { I: Sparkles, t: "Quirky & cute" },
            { I: Cloud, t: "Cozy packaging" },
          ].map(({ I, t }) => (
            <div key={t} className="p-5 rounded-3xl bg-card text-center">
              <I className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-2 font-semibold">{t}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
