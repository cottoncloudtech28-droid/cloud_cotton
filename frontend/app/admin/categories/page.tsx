"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/shop/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Pencil, Check, X, Upload, Plus } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";
import { getCategories, updateCategory, uploadFile, apiFetch } from "@/lib/api";
import type { Category } from "@/lib/types";

// ── Inline edit row ───────────────────────────────────────────────────────────
function CategoryRow({ cat, onSaved }: { cat: Category; onSaved: (c: Category) => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState({
    name: cat.name, description: cat.description,
    emoji: cat.emoji, banner_url: cat.banner_url ?? "", sort_order: cat.sort_order,
  });

  const cancel = () => {
    setDraft({ name: cat.name, description: cat.description, emoji: cat.emoji, banner_url: cat.banner_url ?? "", sort_order: cat.sort_order });
    setEditing(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateCategory(cat.slug, {
        name: draft.name, description: draft.description,
        emoji: draft.emoji, banner_url: draft.banner_url || null, sort_order: draft.sort_order,
      });
      onSaved(updated);
      setEditing(false);
      toast.success(`"${updated.name}" saved`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const uploadBanner = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await uploadFile(file);
      setDraft((d) => ({ ...d, banner_url: url }));
      toast.success("Banner uploaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  if (!editing) {
    return (
      <Card className="p-4 flex items-center gap-4">
        {cat.banner_url ? (
          <img src={cat.banner_url} alt={cat.name}
            className="h-14 w-24 rounded-lg object-cover border border-border shrink-0" />
        ) : (
          <div className="h-14 w-24 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0 text-2xl">
            {cat.emoji}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold">{cat.emoji} {cat.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{cat.slug}</p>
          {cat.description && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{cat.description}</p>
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">order {cat.sort_order}</span>
        <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-4 border-2 border-primary">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm text-muted-foreground font-mono">{cat.slug}</p>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={cancel} disabled={saving}><X className="h-4 w-4" /></Button>
          <Button size="icon" onClick={save} disabled={saving || uploading}><Check className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Name</Label>
          <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
        </div>
        <div className="flex gap-3">
          <div>
            <Label>Emoji</Label>
            <Input value={draft.emoji} onChange={(e) => setDraft((d) => ({ ...d, emoji: e.target.value }))} maxLength={8} className="w-20" />
          </div>
          <div>
            <Label>Sort order</Label>
            <Input type="number" min="0" value={draft.sort_order}
              onChange={(e) => setDraft((d) => ({ ...d, sort_order: parseInt(e.target.value) || 0 }))} className="w-24" />
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label>Description</Label>
          <Textarea value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            rows={2} maxLength={500} placeholder="Shown on the category page" />
        </div>
      </div>

      {/* Banner */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">Banner image</Label>
        {draft.banner_url && (
          <div className="relative w-full h-28 rounded-lg overflow-hidden border border-border bg-muted">
            <img src={draft.banner_url} alt="banner" className="w-full h-full object-contain" />
            <button type="button" onClick={() => setDraft((d) => ({ ...d, banner_url: "" }))}
              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-lg p-3 hover:bg-muted transition-colors">
          <Upload className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {uploading ? "Uploading…" : draft.banner_url ? "Replace banner" : "Upload banner"}
          </span>
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadBanner(e.target.files[0])} />
        </label>
        {!draft.banner_url && (
          <Input value={draft.banner_url}
            onChange={(e) => setDraft((d) => ({ ...d, banner_url: e.target.value }))}
            placeholder="or paste a URL" className="text-xs" />
        )}
      </div>
    </Card>
  );
}

// ── New category form ─────────────────────────────────────────────────────────
function NewCategoryForm({ onCreated }: { onCreated: (c: Category) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ slug: "", name: "", description: "", emoji: "🌸", sort_order: 10 });

  const handleSlug = (v: string) =>
    setForm((f) => ({ ...f, slug: v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.slug || !form.name) { toast.error("Slug and name are required"); return; }
    setSaving(true);
    try {
      const cat = await apiFetch("/api/categories", { method: "POST", body: JSON.stringify(form) });
      onCreated(cat);
      setForm({ slug: "", name: "", description: "", emoji: "🌸", sort_order: 10 });
      setOpen(false);
      toast.success(`"${cat.name}" created`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full border-dashed h-12">
        <Plus className="h-4 w-4 mr-2" /> Add new category
      </Button>
    );
  }

  return (
    <Card className="p-5 space-y-4 border-2 border-dashed">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">New category</h3>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
      </div>
      <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Slug <span className="text-muted-foreground font-normal text-xs">(URL key)</span></Label>
          <Input value={form.slug} onChange={(e) => handleSlug(e.target.value)} placeholder="my-category" required />
        </div>
        <div>
          <Label>Name *</Label>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="My Category" required />
        </div>
        <div className="flex gap-3">
          <div>
            <Label>Emoji</Label>
            <Input value={form.emoji} onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))} maxLength={8} className="w-20" />
          </div>
          <div>
            <Label>Sort order</Label>
            <Input type="number" value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className="w-24" />
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={2} placeholder="Category description…" maxLength={500} />
        </div>
        <div className="sm:col-span-2 flex gap-2">
          <Button type="submit" disabled={saving}>Create</Button>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminCategoriesPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [cats, setCats] = useState<Category[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) router.push(`/auth?redirect=${encodeURIComponent("/admin/categories")}`);
  }, [user, loading, router]);

  useEffect(() => {
    if (!isAdmin) return;
    getCategories()
      .then(setCats)
      .catch((e) => toast.error(e.message))
      .finally(() => setFetching(false));
  }, [isAdmin]);

  const handleSaved = (updated: Category) =>
    setCats((prev) => prev.map((c) => (c.slug === updated.slug ? updated : c)));

  const handleCreated = (created: Category) =>
    setCats((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));

  if (loading) return <AdminPageSkeleton />;

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="container py-12">
          <Card className="p-8 text-center max-w-lg mx-auto">
            <h1 className="text-2xl font-bold mb-2">Admin access required 🔐</h1>
            <p className="text-muted-foreground">Your account ({user?.email}) is not an admin.</p>
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
            <span className="ml-2 text-sm text-muted-foreground">Admin / Categories</span>
          </div>
          <main className="container py-8 space-y-6">
            <div>
              <h1 className="text-4xl font-bold">Categories</h1>
              <p className="text-muted-foreground mt-1">
                Edit names, descriptions, banners and sort order. Click the pencil icon to expand.
              </p>
            </div>
            <Separator />
            {fetching ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {cats.map((cat) => <CategoryRow key={cat.slug} cat={cat} onSaved={handleSaved} />)}
                <NewCategoryForm onCreated={handleCreated} />
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
