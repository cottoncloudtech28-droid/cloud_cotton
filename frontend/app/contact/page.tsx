"use client";

import { useState } from "react";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Instagram, MapPin, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function ContactPage() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = {
      name:    (form.elements.namedItem("name") as HTMLInputElement).value.trim(),
      email:   (form.elements.namedItem("email") as HTMLInputElement).value.trim(),
      message: (form.elements.namedItem("msg") as HTMLTextAreaElement).value.trim(),
    };

    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "Failed to send");
      setSent(true);
      form.reset();
      toast.success("Message sent! We'll get back to you within 1–2 days.");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try emailing us directly.");
    } finally {
      setSending(false);
    }
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
          {sent ? (
            <div className="p-8 rounded-3xl bg-card shadow-soft flex flex-col items-center text-center gap-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold">Message received!</h2>
              <p className="text-muted-foreground text-sm">
                We&apos;ve also sent a confirmation to your email. We&apos;ll reply within 1–2 business days.
              </p>
              <Button
                variant="outline"
                className="rounded-full mt-2"
                onClick={() => setSent(false)}
              >
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4 p-6 rounded-3xl bg-card shadow-soft">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required maxLength={100} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required maxLength={255} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="msg">Message</Label>
                <Textarea id="msg" name="msg" rows={5} required minLength={5} maxLength={2000} className="mt-1.5" />
              </div>
              <Button
                type="submit"
                disabled={sending}
                className="bg-gradient-primary text-primary-foreground border-0 rounded-full w-full"
              >
                {sending ? "Sending…" : "Send message"}
              </Button>
            </form>
          )}

          <div className="space-y-4">
            {[
              {
                Icon: Mail,
                title: "Email",
                content: <a className="text-sm text-muted-foreground hover:text-primary" href="mailto:hello@cottoncloud.co">hello@cottoncloud.co</a>,
              },
              {
                Icon: Instagram,
                title: "Instagram",
                content: <p className="text-sm text-muted-foreground">@cottoncloudcompany</p>,
              },
              {
                Icon: MapPin,
                title: "Studio",
                content: <p className="text-sm text-muted-foreground">India · Ships worldwide</p>,
              },
            ].map(({ Icon, title, content }) => (
              <div key={title} className="p-5 rounded-3xl bg-card shadow-soft flex items-start gap-3">
                <Icon className="h-5 w-5 text-primary mt-1" />
                <div><p className="font-semibold">{title}</p>{content}</div>
              </div>
            ))}
            <div className="p-5 rounded-3xl bg-muted/50 border border-border text-sm text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Response time</p>
              <p>We typically respond within 1–2 business days. For urgent order issues, include your order ID in your message.</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
