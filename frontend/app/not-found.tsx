import Link from "next/link";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";
import { Button } from "@/components/ui/button";
import { Home, ShoppingBag, ShoppingCart, Mail } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">

        {/* Illustration */}
        <div className="relative mb-6 select-none">
          <p className="text-[120px] sm:text-[160px] font-black leading-none text-muted-foreground/10 tracking-tighter">404</p>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-5xl sm:text-6xl">☁️</span>
          </div>
        </div>

        <div className="space-y-3 mb-8 max-w-md">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">This page floated away</h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            Oops! Looks like this page drifted off into the clouds. Let's get you back on track.
          </p>
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/">
            <Button className="rounded-full bg-gradient-primary text-primary-foreground border-0 gap-2 h-11 px-6">
              <Home className="h-4 w-4" /> Back home
            </Button>
          </Link>
          <Link href="/shop">
            <Button variant="outline" className="rounded-full gap-2 h-11 px-6 hover:border-primary/50">
              <ShoppingBag className="h-4 w-4" /> Browse shop
            </Button>
          </Link>
          <Link href="/cart">
            <Button variant="outline" className="rounded-full gap-2 h-11 px-6 hover:border-primary/50">
              <ShoppingCart className="h-4 w-4" /> View cart
            </Button>
          </Link>
          <Link href="/contact">
            <Button variant="outline" className="rounded-full gap-2 h-11 px-6 hover:border-primary/50">
              <Mail className="h-4 w-4" /> Contact us
            </Button>
          </Link>
        </div>

      </main>
      <Footer />
    </div>
  );
}
