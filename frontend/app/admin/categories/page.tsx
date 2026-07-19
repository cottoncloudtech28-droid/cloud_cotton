"use client";

import { useEffect, useRef, useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Pencil, X, Upload, Plus, Trash2, Eye, EyeOff, Sparkles } from "lucide-react";
import { Reorder } from "framer-motion";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";
import { getCategories, updateCategory, deleteCategory, reorderCategories, setCategoryVisibility, uploadFile, apiFetch } from "@/lib/api";
import type { Category, SpecField, SpecFieldType } from "@/lib/types";
import { cn } from "@/lib/utils";

const SPEC_TYPES: { value: SpecFieldType; label: string }[] = [
  { value: "boolean", label: "Yes / No toggle" },
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Dropdown" },
];

const slugifyKey = (s: string) =>
  s.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

const toSlug = (v: string) => v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

const dataUrlToBlob = (dataUrl: string): Blob => {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);/)?.[1] ?? "image/png";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
};

// Quick style presets for the AI category-thumbnail generator. Clicking one fills the
// editable prompt with a category-aware sentence in that style.
const THUMB_STYLES: { label: string; style: string }[] = [
  { label: "Kawaii flat icon", style: "flat friendly kawaii illustration with bold clean shapes and soft pastel colors" },
  { label: "Cute 3D render", style: "cute glossy 3D render, rounded shapes, soft studio lighting, pastel palette" },
  { label: "Pastel sticker", style: "die-cut sticker style with a soft white outline, playful pastel colors" },
  { label: "Realistic product", style: "realistic product photo on a clean pastel background with a soft shadow" },
];

const buildThumbPrompt = (name: string, emoji: string, description: string, style: string) =>
  [
    `A cute thumbnail icon representing the "${name || "product"}" category`,
    emoji ? ` (theme ${emoji})` : "",
    description ? `, ${description}` : "",
    `. ${style}.`,
    " Single centered subject, clean solid light background, subtle shadow, works well cropped into a circle.",
    " No text, words, letters, logos or watermarks.",
  ].join("");

// ── Category spec-field definitions editor ─────────────────────────────────────
function SpecFieldsEditor({ fields, onChange }: { fields: SpecField[]; onChange: (f: SpecField[]) => void }) {
  const update = (i: number, patch: Partial<SpecField>) =>
    onChange(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  const setLabel = (i: number, label: string) => {
    const f = fields[i];
    // Freeze the key on first label so saved product values keep matching across renames.
    const key = f.key || slugifyKey(label);
    update(i, { label, key });
  };

  const add = () =>
    onChange([...fields, { key: "", label: "", type: "boolean", options: [], unit: "", sort_order: fields.length }]);

  const remove = (i: number) => onChange(fields.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-1.5">Specification fields</Label>
      <p className="text-xs text-muted-foreground -mt-1">
        Fields shown when adding/editing a product in this category. Yes/No toggles are great for features;
        use text, number, or dropdown for other details.
      </p>
      {fields.length > 0 && (
        <div className="space-y-2">
          {fields.map((f, i) => (
            <div key={i} className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <Input value={f.label} onChange={(e) => setLabel(i, e.target.value)}
                    placeholder="e.g. Leak-proof, Capacity, Material" className="h-9" />
                </div>
                <select value={f.type}
                  onChange={(e) => update(i, { type: e.target.value as SpecFieldType })}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                  {SPEC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => remove(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              {f.type === "select" && (
                <Input value={(f.options ?? []).join(", ")}
                  onChange={(e) => update(i, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })}
                  placeholder="Options, comma-separated: Small, Medium, Large" className="h-9 text-xs" />
              )}
              {f.type === "number" && (
                <Input value={f.unit ?? ""} onChange={(e) => update(i, { unit: e.target.value })}
                  placeholder="Unit (optional): ml, cm, g…" className="h-9 text-xs w-40" />
              )}
            </div>
          ))}
        </div>
      )}
      <Button type="button" variant="outline" size="sm" className="border-dashed" onClick={add}>
        <Plus className="h-4 w-4 mr-1.5" /> Add specification field
      </Button>
    </div>
  );
}

// ── Category row (summary card) ─────────────────────────────────────────────────
function CategoryRow({ cat, onDeleted, onEdit, onToggled }: {
  cat: Category; onDeleted: (slug: string) => void; onEdit: (cat: Category) => void;
  onToggled: (cat: Category) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteCategory(cat.slug);
      onDeleted(cat.slug);
      toast.success(`"${cat.name}" deleted`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const toggleVisible = async () => {
    setToggling(true);
    try {
      const updated = await setCategoryVisibility(cat.slug, !cat.is_active);
      onToggled(updated);
      toast.success(`"${cat.name}" ${updated.is_active ? "is now visible" : "is now hidden"}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setToggling(false);
    }
  };

  return (
    <Card className={`p-4 flex items-center gap-4 ${cat.is_active === false ? "opacity-60" : ""}`}>
      {cat.banner_url ? (
        <img src={cat.banner_url} alt={cat.name}
          className="h-14 w-24 rounded-lg object-cover border border-border shrink-0" />
      ) : (
        <div className="h-14 w-24 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0 text-2xl">
          {cat.emoji}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold flex items-center gap-2">
          {cat.emoji} {cat.name}
          {cat.is_active === false && (
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground border border-border rounded-full px-2 py-0.5">
              Hidden
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground font-mono">{cat.slug}</p>
        {cat.description && (
          <p className="text-sm text-muted-foreground mt-0.5 truncate">{cat.description}</p>
        )}
        {(cat.spec_fields?.length ?? 0) > 0 && (
          <p className="text-xs text-primary mt-0.5">{cat.spec_fields!.length} spec field{cat.spec_fields!.length !== 1 ? "s" : ""}</p>
        )}
      </div>
      <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">order {cat.sort_order}</span>
      <Button variant="ghost" size="icon" disabled={toggling} onClick={toggleVisible}
        title={cat.is_active === false ? "Show on site" : "Hide from site"}>
        {cat.is_active === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="icon" onClick={() => onEdit(cat)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" disabled={deleting}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{cat.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the category. Categories that still have products assigned to
              them can't be deleted — reassign or remove those products first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ── Add / edit category form (lives inside the drawer) ───────────────────────────
type CategoryFormState = {
  slug: string; name: string; description: string; emoji: string;
  sort_order: number; banner_url: string; is_active: boolean; spec_fields: SpecField[];
};

const emptyCategoryForm: CategoryFormState = {
  slug: "", name: "", description: "", emoji: "🌸", sort_order: 10, banner_url: "", is_active: true, spec_fields: [],
};

function CategoryForm({ initial, onSaved, onCancel }: {
  initial: Category | null;
  onSaved: (cat: Category, mode: "create" | "edit") => void;
  onCancel: () => void;
}) {
  const isEdit = !!initial;
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiProvider, setAiProvider] = useState<"openai" | "gemini">("openai");
  const [aiPrompt, setAiPrompt] = useState("");
  // Slug auto-fills from the name until the user edits it directly; locked entirely when editing.
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [form, setForm] = useState<CategoryFormState>(() => initial ? {
    slug: initial.slug, name: initial.name, description: initial.description,
    emoji: initial.emoji, sort_order: initial.sort_order, banner_url: initial.banner_url ?? "",
    is_active: initial.is_active !== false, spec_fields: initial.spec_fields ?? [],
  } : emptyCategoryForm);

  const handleSlug = (v: string) => {
    setSlugTouched(true);
    setForm((f) => ({ ...f, slug: toSlug(v) }));
  };

  const handleName = (v: string) =>
    setForm((f) => ({ ...f, name: v, slug: slugTouched ? f.slug : toSlug(v) }));

  const uploadBanner = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await uploadFile(file);
      setForm((f) => ({ ...f, banner_url: url }));
      toast.success("Banner uploaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const generateBanner = async () => {
    if (!form.name.trim()) { toast.error("Enter a category name first"); return; }
    setGenerating(true);
    try {
      const data = await apiFetch("/api/ai/generate-image", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          emoji: form.emoji,
          prompt: aiPrompt.trim() || undefined,
          provider: aiProvider,
        }),
      });
      if (!data?.image_base64) throw new Error("No image returned");
      const blob = dataUrlToBlob(data.image_base64);
      const { url } = await uploadFile(blob, `category-${form.slug || "thumb"}-${Date.now()}.png`);
      setForm((f) => ({ ...f, banner_url: url }));
      toast.success("Thumbnail generated ✨");
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.slug || !form.name) { toast.error("Slug and name are required"); return; }
    setSaving(true);
    try {
      const cat = isEdit
        ? await updateCategory(initial!.slug, {
            name: form.name, description: form.description, emoji: form.emoji,
            banner_url: form.banner_url || null, sort_order: form.sort_order,
            is_active: form.is_active, spec_fields: form.spec_fields,
          })
        : await apiFetch("/api/categories", {
            method: "POST",
            body: JSON.stringify({ ...form, banner_url: form.banner_url || null }),
          });
      onSaved(cat, isEdit ? "edit" : "create");
      toast.success(`"${cat.name}" ${isEdit ? "saved" : "created"}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6 pb-8">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Name *</Label>
          <Input value={form.name} onChange={(e) => handleName(e.target.value)}
            placeholder="My Category" required autoFocus />
        </div>
        <div>
          <Label>Slug <span className="text-muted-foreground font-normal text-xs">
            {isEdit ? "(URL key — can't be changed)" : "(URL key, auto-filled from name)"}
          </span></Label>
          <Input value={form.slug} onChange={(e) => handleSlug(e.target.value)}
            placeholder="my-category" required disabled={isEdit} readOnly={isEdit}
            className={isEdit ? "font-mono text-muted-foreground bg-muted cursor-not-allowed" : "font-mono"} />
        </div>
        <div className="flex gap-3">
          <div>
            <Label>Emoji</Label>
            <Input value={form.emoji} onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
              maxLength={8} className="w-20" />
          </div>
          <div>
            <Label>Sort order</Label>
            <Input type="number" min="0" value={form.sort_order}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className="w-24" />
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={2} maxLength={500} placeholder="Shown on the category page" />
        </div>
        <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <Label className="mb-0">Visible on site</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hidden categories stay editable here but won't show on the homepage or shop.
            </p>
          </div>
          <Switch checked={form.is_active} onCheckedChange={(is_active) => setForm((f) => ({ ...f, is_active }))} />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">Banner image</Label>
        {form.banner_url && (
          <div className="relative w-full h-28 rounded-lg overflow-hidden border border-border bg-muted">
            <img src={form.banner_url} alt="banner" className="w-full h-full object-contain" />
            <button type="button" onClick={() => setForm((f) => ({ ...f, banner_url: "" }))}
              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-lg p-3 hover:bg-muted transition-colors">
          <Upload className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {uploading ? "Uploading…" : form.banner_url ? "Replace banner" : "Upload banner"}
          </span>
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadBanner(e.target.files[0])} />
        </label>

        {/* AI thumbnail generator — pick an engine, optionally a style, then generate */}
        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm font-medium flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" /> Generate with AI
            </span>
            <div className="flex items-center gap-1 rounded-full border border-border bg-background p-0.5 text-xs">
              {(["openai", "gemini"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setAiProvider(p)}
                  className={cn(
                    "px-3 py-1 rounded-full font-medium transition-colors",
                    aiProvider === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}>
                  {p === "openai" ? "OpenAI" : "Gemini"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {THUMB_STYLES.map((s) => (
              <button key={s.label} type="button"
                onClick={() => setAiPrompt(buildThumbPrompt(form.name, form.emoji, form.description, s.style))}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-xs hover:border-primary hover:text-primary transition-colors">
                {s.label}
              </button>
            ))}
          </div>

          <Textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={3}
            placeholder="Pick a style above or describe the thumbnail — leave blank to auto-build from the category name, emoji & description."
            className="text-xs" />

          <Button type="button" onClick={generateBanner} disabled={generating || uploading} className="w-full">
            <Sparkles className={`h-4 w-4 mr-1.5 ${generating ? "animate-pulse" : ""}`} />
            {generating ? "Generating…" : `Generate with ${aiProvider === "openai" ? "OpenAI" : "Gemini"}`}
          </Button>
        </div>
        {!form.banner_url && (
          <Input value={form.banner_url}
            onChange={(e) => setForm((f) => ({ ...f, banner_url: e.target.value }))}
            placeholder="or paste a URL" className="text-xs" />
        )}
      </div>

      <Separator />
      <SpecFieldsEditor fields={form.spec_fields}
        onChange={(spec_fields) => setForm((f) => ({ ...f, spec_fields }))} />

      <Separator />
      <div className="flex gap-3 flex-wrap pt-2">
        <Button type="submit" size="lg" className="flex-1" disabled={saving || uploading || generating}>
          {isEdit ? "Save changes" : "Create category"}
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminCategoriesPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [cats, setCats] = useState<Category[]>([]);
  const [fetching, setFetching] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const catsRef = useRef<Category[]>([]);
  catsRef.current = cats;

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

  const openCreate = () => { setEditingCat(null); setDrawerOpen(true); };
  const openEdit = (cat: Category) => { setEditingCat(cat); setDrawerOpen(true); };

  const handleSaved = (cat: Category, mode: "create" | "edit") => {
    setCats((prev) => mode === "edit"
      ? prev.map((c) => (c.slug === cat.slug ? cat : c))
      : [...prev, cat].sort((a, b) => a.sort_order - b.sort_order));
    setDrawerOpen(false);
  };

  const handleDeleted = (slug: string) =>
    setCats((prev) => prev.filter((c) => c.slug !== slug));

  const handleToggled = (cat: Category) =>
    setCats((prev) => prev.map((c) => (c.slug === cat.slug ? cat : c)));

  const persistOrder = async () => {
    const order = catsRef.current.map((c, i) => ({ slug: c.slug, sort_order: i }));
    try {
      const updated = await reorderCategories(order);
      setCats(updated);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

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
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold">Categories</h1>
                <p className="text-muted-foreground mt-1">
                  Edit names, descriptions, banners and sort order. Click the pencil icon to edit.
                </p>
              </div>
              <Button onClick={openCreate} className="shrink-0">
                <Plus className="h-4 w-4 mr-1.5" /> Add category
              </Button>
            </div>
            <Separator />
            {!fetching && cats.length > 0 && (
              <div className="rounded-xl border border-border bg-card py-4">
                <p className="text-xs font-semibold text-muted-foreground px-4 mb-3">
                  Homepage preview — drag a circle to reorder
                </p>
                <Reorder.Group axis="x" values={cats} onReorder={setCats}
                  className="flex gap-4 md:gap-5 overflow-x-auto scrollbar-none pb-1 px-4">
                  {cats.map((c) => (
                    <Reorder.Item key={c.slug} value={c} onDragEnd={persistOrder}
                      className="flex-shrink-0 flex flex-col items-center gap-1.5 w-[64px] md:w-[88px] cursor-grab active:cursor-grabbing touch-none">
                      <div className="h-14 w-14 md:h-20 md:w-20 rounded-full border border-border/60 overflow-hidden bg-muted flex items-center justify-center pointer-events-none">
                        {c.banner_url ? (
                          <img src={c.banner_url} alt={c.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl md:text-3xl">{c.emoji}</span>
                        )}
                      </div>
                      <p className="text-[10px] md:text-xs font-semibold text-center leading-tight text-foreground pointer-events-none">{c.name}</p>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>
            )}
            {fetching ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : cats.length === 0 ? (
              <Card className="p-10 text-center text-muted-foreground">
                No categories yet — click "Add category" above to create your first one.
              </Card>
            ) : (
              <div className="space-y-3">
                {cats.map((cat) => (
                  <CategoryRow key={cat.slug} cat={cat} onDeleted={handleDeleted} onEdit={openEdit} onToggled={handleToggled} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ── Add / edit category drawer ────────────────────────────── */}
      <Sheet open={drawerOpen} onOpenChange={(open) => { if (!open) setDrawerOpen(false); }}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <SheetTitle className="text-xl">
              {editingCat ? "Edit category" : "Add new category"}
            </SheetTitle>
            <SheetDescription>
              {editingCat
                ? "Update the category details below and save."
                : "Create a new category for organizing products."}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 px-6 pt-6">
            <CategoryForm initial={editingCat} onSaved={handleSaved} onCancel={() => setDrawerOpen(false)} />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </SidebarProvider>
  );
}
