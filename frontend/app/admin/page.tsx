"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/shop/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Pencil, Trash2, Plus, Upload, X, ImagePlus, Tag, Ruler,
} from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";
import { apiFetch, uploadFile } from "@/lib/api";
import type { Product, ProductSize } from "@/lib/types";

// ── Validation schema ─────────────────────────────────────────────────────────
const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  short_description: z.string().trim().max(300).optional(),
  description: z.string().trim().max(2000).optional(),
  price: z.number().min(0).max(1_000_000),
  discount_percent: z.number().int().min(0).max(100),
  category: z.string().trim().min(1, "Category is required").max(40),
  stock: z.number().int().min(0).max(100_000),
  colors: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  sizes: z.array(z.object({ label: z.string().min(1), stock: z.number().int().min(0) })).optional(),
});

const emptyForm = {
  name: "", short_description: "", description: "",
  price: 0, discount_percent: 0,
  category: "stationery", stock: 0,
  colors: [] as string[],
  tags: [] as string[],
  images: [] as string[],
  sizes: [] as ProductSize[],
  sku: "",
};

type FormState = typeof emptyForm;

// ── Chip input helper ─────────────────────────────────────────────────────────
function ChipInput({
  label, icon, values, onChange, placeholder,
}: {
  label: string;
  icon: React.ReactNode;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim().toLowerCase();
    if (!v || values.includes(v)) { setDraft(""); return; }
    onChange([...values, v]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">{icon} {label}</Label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map((v) => (
          <Badge key={v} variant="secondary" className="gap-1 pl-2.5 pr-1 py-0.5">
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))}
              className="ml-0.5 rounded-full hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder ?? `Type and press Enter`}
          className="flex-1" />
        <Button type="button" variant="outline" size="sm" onClick={add}>Add</Button>
      </div>
    </div>
  );
}

// ── Size rows ─────────────────────────────────────────────────────────────────
function SizeRows({ sizes, onChange }: {
  sizes: ProductSize[];
  onChange: (s: ProductSize[]) => void;
}) {
  const addRow = () => onChange([...sizes, { label: "", stock: 0 }]);
  const removeRow = (i: number) => onChange(sizes.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof ProductSize, val: string | number) =>
    onChange(sizes.map((s, idx) => idx === i ? { ...s, [field]: val } : s));

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5"><Ruler className="h-4 w-4" /> Size variants</Label>
      <p className="text-xs text-muted-foreground">
        When sizes are added, total stock = sum of all size stocks.
      </p>
      {sizes.map((sz, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input value={sz.label} onChange={(e) => update(i, "label", e.target.value)}
            placeholder="e.g. 500ml / S / A4" className="flex-1" />
          <Input type="number" min="0" value={sz.stock}
            onChange={(e) => update(i, "stock", parseInt(e.target.value) || 0)}
            placeholder="Stock" className="w-24" />
          <button type="button" onClick={() => removeRow(i)}
            className="text-muted-foreground hover:text-destructive transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Add size
      </Button>
    </div>
  );
}

// ── Multi-image uploader ──────────────────────────────────────────────────────
function MultiImageUploader({ images, onChange }: {
  images: string[];
  onChange: (imgs: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList) => {
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        const { url } = await uploadFile(f);
        urls.push(url);
      }
      onChange([...images, ...urls]);
      toast.success(`${urls.length} image${urls.length > 1 ? "s" : ""} uploaded`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5"><ImagePlus className="h-4 w-4" /> Product images</Label>
      <p className="text-xs text-muted-foreground">First image is the primary. Drag-to-reorder not yet supported.</p>

      {/* Existing thumbnails */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <div key={url + i} className="relative h-20 w-20 rounded-lg overflow-hidden border border-border group">
              <img src={url} alt={`Image ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute top-0.5 left-0.5 bg-primary text-primary-foreground text-[9px] px-1 rounded">
                  Primary
                </span>
              )}
              <button type="button"
                onClick={() => onChange(images.filter((_, idx) => idx !== i))}
                className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/60 text-white hidden group-hover:flex items-center justify-center">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:bg-muted transition-colors">
        <Upload className="h-6 w-6 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {uploading ? "Uploading…" : "Click to upload (multiple allowed)"}
        </span>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => e.target.files?.length && upload(e.target.files)} />
      </label>
    </div>
  );
}

// ── Main admin page ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Product[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.push(`/auth?redirect=${encodeURIComponent("/admin")}`);
  }, [user, loading, router]);

  const load = async () => {
    setItemsLoading(true);
    try {
      const data = await apiFetch("/api/products/all");
      setItems(data ?? []);
    } catch (e: any) { toast.error(e.message); }
    finally { setItemsLoading(false); }
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const reset = () => { setForm(emptyForm); setEditingId(null); };

  const setField = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      ...form,
      price: Number(form.price),
      discount_percent: Number(form.discount_percent),
      stock: form.sizes.length > 0
        ? form.sizes.reduce((s, sz) => s + sz.stock, 0)
        : Number(form.stock),
    });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }

    const payload = {
      ...parsed.data,
      images: form.images,
      image_url: form.images[0] ?? null,
    };

    try {
      await (editingId
        ? apiFetch(`/api/products/${editingId}`, { method: "PUT", body: JSON.stringify(payload) })
        : apiFetch("/api/products", { method: "POST", body: JSON.stringify(payload) }));
      toast.success(editingId ? "Product updated 🌸" : "Product added 🌸");
      reset(); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const edit = (p: Product) => {
    setEditingId(p.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setForm({
      name: p.name,
      short_description: p.short_description ?? "",
      description: p.description ?? "",
      price: p.price,
      discount_percent: p.discount_percent,
      category: p.category,
      stock: p.stock,
      colors: p.colors ?? [],
      tags: p.tags ?? [],
      images: p.images?.length ? p.images : (p.image_url ? [p.image_url] : []),
      sizes: p.sizes ?? [],
      sku: p.sku ?? "",
    });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    try {
      await apiFetch(`/api/products/${id}`, { method: "DELETE" });
      toast.success("Deleted"); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const toggle = async (p: Product) => {
    try {
      await apiFetch(`/api/products/${p.id}/toggle`, { method: "PATCH" });
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <AdminPageSkeleton />;

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="container py-12">
          <Card className="p-8 text-center max-w-lg mx-auto">
            <h1 className="text-2xl font-bold mb-2">Admin access required 🔐</h1>
            <p className="text-muted-foreground mb-4">
              Your account ({user?.email}) is signed in but is not an admin.
            </p>
            <p className="text-xs text-muted-foreground break-all">User ID: {user?.id}</p>
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
            <span className="ml-2 text-sm text-muted-foreground">Admin / Products</span>
          </div>
          <main className="container py-8 space-y-10">

            {/* Header */}
            <div className="flex items-end justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-4xl font-bold">Inventory</h1>
                <p className="text-muted-foreground mt-1">
                  {itemsLoading ? "Loading…" : `${items.length} product${items.length !== 1 ? "s" : ""} in catalog`}
                </p>
              </div>
              <Button size="lg" onClick={() => router.push("/admin/bulk")}>
                <Upload className="h-4 w-4 mr-2" /> Bulk Upload
              </Button>
            </div>

            {/* ── Form ────────────────────────────────────────────────────── */}
            <Card className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  {editingId ? "Edit product" : "Add new product"}
                </h2>
                {editingId && form.sku && (
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                    SKU: {form.sku}
                  </span>
                )}
              </div>

              <form onSubmit={save} className="space-y-5">
                {/* Basic info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Product name *</Label>
                    <Input value={form.name} onChange={(e) => setField("name", e.target.value)}
                      required placeholder="Starry Night Mini Lamp" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Short description <span className="text-muted-foreground font-normal">(shown on card)</span></Label>
                    <Textarea value={form.short_description}
                      onChange={(e) => setField("short_description", e.target.value)}
                      rows={2} maxLength={300}
                      placeholder="One-line summary shown under the product name" />
                    <p className="text-xs text-muted-foreground mt-1 text-right">
                      {form.short_description.length}/300
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Full description</Label>
                    <Textarea value={form.description}
                      onChange={(e) => setField("description", e.target.value)}
                      rows={4} maxLength={2000}
                      placeholder="Detailed product description, materials, care instructions, etc." />
                    <p className="text-xs text-muted-foreground mt-1 text-right">
                      {form.description.length}/2000
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Pricing + category */}
                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Price (₹) *</Label>
                    <Input type="number" step="0.01" min="0" value={form.price}
                      onChange={(e) => setField("price", parseFloat(e.target.value) || 0)} required />
                  </div>
                  <div>
                    <Label>Discount %</Label>
                    <Input type="number" min="0" max="100" value={form.discount_percent}
                      onChange={(e) => setField("discount_percent", parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label>Category *</Label>
                    <Input value={form.category}
                      onChange={(e) => setField("category", e.target.value)}
                      placeholder="stationery / toys / quirky" required />
                  </div>
                  <div>
                    <Label>Stock {form.sizes.length > 0 && <span className="text-muted-foreground font-normal">(auto from sizes)</span>}</Label>
                    <Input type="number" min="0"
                      value={form.sizes.length > 0
                        ? form.sizes.reduce((s, sz) => s + sz.stock, 0)
                        : form.stock}
                      disabled={form.sizes.length > 0}
                      onChange={(e) => setField("stock", parseInt(e.target.value) || 0)} />
                  </div>
                </div>

                <Separator />

                {/* Images */}
                <MultiImageUploader images={form.images}
                  onChange={(imgs) => setField("images", imgs)} />

                <Separator />

                {/* Variants */}
                <div className="grid md:grid-cols-2 gap-6">
                  <ChipInput label="Colors" icon={<span className="text-sm">🎨</span>}
                    values={form.colors} onChange={(v) => setField("colors", v)}
                    placeholder="sakura pink, sky blue…" />
                  <ChipInput label="Tags" icon={<Tag className="h-4 w-4" />}
                    values={form.tags} onChange={(v) => setField("tags", v)}
                    placeholder="kawaii, gift, pastel…" />
                </div>

                <SizeRows sizes={form.sizes} onChange={(v) => setField("sizes", v)} />

                <Separator />

                {/* Actions */}
                <div className="flex gap-3 flex-wrap">
                  <Button type="submit" className="bg-primary text-primary-foreground">
                    {editingId ? "Save changes" : "Add product"}
                  </Button>
                  {editingId && (
                    <Button type="button" variant="outline" onClick={reset}>Cancel</Button>
                  )}
                </div>
              </form>
            </Card>

            {/* ── Product list ────────────────────────────────────────────── */}
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">All products ({itemsLoading ? "…" : items.length})</h2>
              {itemsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-xl" />
                  ))}
                </div>
              ) : items.map((p) => {
                const imgSrc = p.images?.[0] ?? p.image_url;
                return (
                  <Card key={p.id} className="p-4 flex items-center gap-4">
                    <div className="h-16 w-16 rounded-xl bg-muted overflow-hidden shrink-0 border border-border">
                      {imgSrc && <img src={imgSrc} alt={p.name} className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{p.name}</p>
                        {!p.is_active && <Badge variant="outline" className="text-xs">hidden</Badge>}
                        {p.discount_percent > 0 && (
                          <Badge className="bg-destructive text-destructive-foreground text-xs">
                            -{p.discount_percent}%
                          </Badge>
                        )}
                        {p.sku && (
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {p.sku}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ₹{p.price} · {p.category} · stock {p.stock}
                        {p.sizes && p.sizes.length > 0 && ` (${p.sizes.length} sizes)`}
                        {p.tags && p.tags.length > 0 && ` · ${p.tags.slice(0, 3).map(t => `#${t}`).join(" ")}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => toggle(p)} className="text-xs">
                        {p.is_active ? "Hide" : "Show"}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => edit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
