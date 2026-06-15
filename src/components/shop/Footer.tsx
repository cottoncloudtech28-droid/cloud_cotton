import { Link } from "react-router-dom";
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
            <li><Link to="/about" className="hover:text-primary">About us</Link></li>
            <li><Link to="/contact" className="hover:text-primary">Contact us</Link></li>
            <li><Link to="/shipping" className="hover:text-primary">Delivery &amp; Shipping</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}