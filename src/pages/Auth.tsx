import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/shop/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Min 6 characters").max(72),
});

export default function Auth() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const redirectTo = new URLSearchParams(location.search).get("redirect") || "/";

  useEffect(() => { if (user) nav(redirectTo); }, [user, nav, redirectTo]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setLoading(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}${redirectTo}` },
      });
      if (error) toast.error(error.message); else toast.success("Welcome! 🌸 You're signed in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message); else toast.success("Welcome back! ✨");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container max-w-md py-12">
        <Card className="p-8 rounded-3xl shadow-cute">
          <h1 className="text-3xl font-bold mb-1">{mode === "signin" ? "Welcome back" : "Join the cute club"}</h1>
          <p className="text-muted-foreground mb-6">{mode === "signin" ? "Sign in to your account" : "Create an account to start shopping"}</p>
          <form onSubmit={submit} className="space-y-4">
            <div><Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div><Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground border-0 rounded-full">
              {loading ? "..." : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 text-sm text-primary hover:underline w-full text-center">
            {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
          <p className="text-xs text-muted-foreground text-center mt-6">
            <Link to="/" className="hover:underline">← Back to shop</Link>
          </p>
        </Card>
      </main>
    </div>
  );
}
