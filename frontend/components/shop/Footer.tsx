import Link from "next/link";
import { Cloud, Mail, Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-card/50">
      <div className="container py-12 grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-extrabold uppercase">
            <Cloud className="h-6 w-6 text-primary fill-primary/20" />
            <span className="bg-gradient-primary bg-clip-text text-transparent">Cotton Cloud Company</span>
          </div>
          <p className="font-semibold mb-3 pt-2">Get in touch</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> hello.cottoncloudco</li>
            <li className="flex items-center gap-2"><Instagram className="h-4 w-4" /> cottoncloudcompany</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold mb-3">Information</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/about" className="hover:text-primary">About us</Link></li>
            <li><Link href="/contact" className="hover:text-primary">Contact us</Link></li>
            <li><Link href="/shipping" className="hover:text-primary">Delivery &amp; Shipping</Link></li>
            <li><Link href="/track-order" className="hover:text-primary">Track your order</Link></li>
            <li><Link href="/returns" className="hover:text-primary">Returns &amp; Exchanges</Link></li>
            <li><Link href="/terms" className="hover:text-primary">Terms &amp; Conditions</Link></li>
            <li><Link href="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="container pb-6 text-center text-xs text-muted-foreground/60">
        &copy; {new Date().getFullYear()} Cotton Cloud Company. All rights reserved.
      </div>
    </footer>
  );
}
