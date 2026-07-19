import Link from "next/link";
import { Cloud, Mail, Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-card/50">
      <div className="container py-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-extrabold uppercase">
            <Cloud className="h-6 w-6 text-primary fill-primary/20" />
            <span className="bg-gradient-primary bg-clip-text text-transparent">Cotton Cloud Company</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Cute kawaii stationery, plushies, and gifts to sprinkle a little joy into your everyday.
          </p>
        </div>
        <div>
          <p className="font-semibold mb-3">Get in touch</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" />
              <Link href="/contact" className="hover:text-primary transition-colors">hello@cottoncloud.co</Link>
            </li>
            <li className="flex items-center gap-2">
              <Instagram className="h-4 w-4 shrink-0" />
              <a
                href="https://www.instagram.com/cottoncloudcompany/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                @cottoncloudcompany
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold mb-3">Information</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/about" className="hover:text-primary">About us</Link></li>
            <li><Link href="/shipping" className="hover:text-primary">Delivery &amp; Shipping</Link></li>
            <li><Link href="/track-order" className="hover:text-primary">Track your order</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold mb-3">Policies</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/returns" className="hover:text-primary">Returns &amp; Refunds</Link></li>
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
