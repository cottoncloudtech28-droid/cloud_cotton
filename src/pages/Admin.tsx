import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/shop/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Upload } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

interface Product {
  id: string; name: string; description: string | null; price: number;
  discount_percent: number; image_url: string | null; category: string;
  stock: number; is_active: boolean;
}

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  price: z.number().min(0).max(1000000),
  discount_percent: z.number().int().min(0).max(100),
  category: z.string().trim().min(1).max(40),
  stock: z.number().int().min(0).max(100000),
});

const empty = { name: "", description: "", price: 0, discount_percent: 0, category: "stationery", stock: 0, image_url: "" };

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<Product[]>([]);
  const [form, setForm] = useState<any>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) nav(`/auth?redirect=${encodeURIComponent("/admin")}`);
  }, [user, loading, nav]);

  const load = async () => {
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const reset = () => { setForm(empty); setEditingId(null); };

  const upload = async (file: File) => {
    setUploading(true);
    const path = `${user!.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("products").upload(path, file);
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("products").getPublicUrl(path);
    setForm((f: any) => ({ ...f, image_url: data.publicUrl }));
    setUploading(false);
    toast.success("Image uploaded ✨");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      ...form, price: Number(form.price), discount_percent: Number(form.discount_percent), stock: Number(form.stock)
    });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    const payload = {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      price: parsed.data.price,
      discount_percent: parsed.data.discount_percent,
      category: parsed.data.category,
      stock: parsed.data.stock,
      image_url: form.image_url || null,
    };
    const { error } = editingId
      ? await supabase.from("products").update(payload).eq("id", editingId)
      : await supabase.from("products").insert([payload]);
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? "Updated 🌸" : "Added 🌸");
    reset(); load();
  };

  const edit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name, description: p.description ?? "", price: p.price,
      discount_percent: p.discount_percent, category: p.category, stock: p.stock,
      image_url: p.image_url ?? "",
    });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  const toggle = async (p: Product) => {
    await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    load();
  };

  if (loading) return <div className="min-h-screen grid place-items-center">Loading…</div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="container max-w-lg py-12">
          <Card className="p-8 rounded-3xl text-center shadow-cute">
            <h1 className="text-2xl font-bold mb-2">Admin access required 🔐</h1>
            <p className="text-muted-foreground mb-4">
              Your account ({user?.email}) is signed in, but it is not an admin yet.
            </p>
            <p className="text-xs text-muted-foreground break-all">Your user id: {user?.id}</p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <div className="h-10 flex items-center border-b px-2">
            <SidebarTrigger />
            <span className="ml-2 text-sm text-muted-foreground">Admin</span>
          </div>
          <main className="container py-8 space-y-8">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-4xl font-bold">Inventory</h1>
            <p className="text-muted-foreground mt-1">Manage your kawaii catalog ✨</p>
          </div>
          <Button size="lg" onClick={() => nav("/admin/bulk")} className="rounded-full bg-gradient-primary text-primary-foreground border-0 shadow-cute">
            <Upload className="h-4 w-4" /> Bulk Upload
          </Button>
        </div>

        <Card className="p-5 rounded-3xl shadow-soft border-primary/30 bg-primary/5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold">Upload product photos</h2>
              <p className="text-sm text-muted-foreground">Add multiple product images and save them to inventory together.</p>
            </div>
            <Button onClick={() => nav("/admin/bulk")} className="rounded-full bg-gradient-primary text-primary-foreground border-0">
              <Upload className="h-4 w-4" /> Open Bulk Upload
            </Button>
          </div>
        </Card>

        <Card className="p-6 rounded-3xl shadow-soft">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5" /> {editingId ? "Edit product" : "Add new product"}
          </h2>
          <form onSubmit={save} className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="md:col-span-2"><Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Price (₹)</Label>
              <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></div>
            <div><Label>Discount %</Label>
              <Input type="number" min="0" max="100" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} /></div>
            <div><Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="stationery / toys / quirky" required /></div>
            <div><Label>Stock</Label>
              <Input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required /></div>
            <div className="md:col-span-2"><Label>Image</Label>
              <div className="flex items-center gap-3">
                <label className="flex-1 cursor-pointer">
                  <div className="border-2 border-dashed border-border rounded-2xl p-4 text-center hover:bg-muted transition-bounce">
                    <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{uploading ? "Uploading…" : "Click to upload"}</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                </label>
                {form.image_url && <img src={form.image_url} alt="" className="h-16 w-16 rounded-xl object-cover" />}
              </div>
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" className="bg-gradient-primary text-primary-foreground border-0 rounded-full">
                {editingId ? "Save changes" : "Add product"}
              </Button>
              {editingId && <Button type="button" variant="outline" onClick={reset} className="rounded-full">Cancel</Button>}
            </div>
          </form>
        </Card>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold">All products ({items.length})</h2>
          {items.map((p) => (
            <Card key={p.id} className="p-4 rounded-2xl flex items-center gap-4 shadow-soft">
              <div className="h-16 w-16 rounded-xl bg-gradient-hero overflow-hidden shrink-0">
                {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{p.name}</p>
                  {!p.is_active && <Badge variant="outline">hidden</Badge>}
                  {p.discount_percent > 0 && <Badge className="bg-destructive text-destructive-foreground">-{p.discount_percent}%</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">₹{p.price} · {p.category} · stock {p.stock}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => toggle(p)}>{p.is_active ? "Hide" : "Show"}</Button>
              <Button variant="ghost" size="icon" onClick={() => edit(p)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </Card>
          ))}
        </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
