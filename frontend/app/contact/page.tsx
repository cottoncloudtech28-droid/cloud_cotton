"use client";

import { useState } from "react";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Instagram, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ContactPage() {
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      (e.target as HTMLFormElement).reset();
      toast({ title: "Message sent ☁️", description: "We'll get back to you within 1-2 days." });
    }, 600);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-12">
        <h1 className="text-4xl md:text-5xl font-extrabold uppercase bg-gradient-primary bg-clip-text text-transparent">
          Contact us
        </h1>
        <p className="text-muted-foreground mt-2">We&apos;d love to hear from you — drop us a note!</p>

        <div className="mt-8 grid md:grid-cols-2 gap-8">
          <form onSubmit={onSubmit} className="space-y-4 p-6 rounded-3xl bg-card shadow-soft">
            <div><Label htmlFor="name">Name</Label><Input id="name" required /></div>
            <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required /></div>
            <div><Label htmlFor="msg">Message</Label><Textarea id="msg" rows={5} required /></div>
            <Button type="submit" disabled={sending} className="bg-gradient-primary text-primary-foreground border-0 rounded-full w-full">
              {sending ? "Sending…" : "Send message"}
            </Button>
          </form>

          <div className="space-y-4">
            {[
              { Icon: Mail, title: "Email", content: <a className="text-sm text-muted-foreground hover:text-primary" href="mailto:hello@cottoncloud.co">hello@cottoncloud.co</a> },
              { Icon: Instagram, title: "Instagram", content: <p className="text-sm text-muted-foreground">@cottoncloudcompany</p> },
              { Icon: MapPin, title: "Studio", content: <p className="text-sm text-muted-foreground">India · Ships worldwide</p> },
            ].map(({ Icon, title, content }) => (
              <div key={title} className="p-5 rounded-3xl bg-card shadow-soft flex items-start gap-3">
                <Icon className="h-5 w-5 text-primary mt-1" />
                <div><p className="font-semibold">{title}</p>{content}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
