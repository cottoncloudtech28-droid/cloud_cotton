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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Pencil, Trash2, Plus, Upload, X, ImagePlus, Tag, Ruler,
  ChevronDown, ChevronUp, Package, Eye, EyeOff, Wand2, Sparkles,
} from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";
import { apiFetch, uploadFile } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Product, ProductSize } from "@/lib/types";

// ── AI image-editing presets ──────────────────────────────────────────────────
const AI_BACKGROUNDS = [
  { label: "Pink aesthetic", value: "Replace background with a soft dreamy pastel pink aesthetic backdrop with subtle bokeh, keep the product centered and lighting natural" },
  { label: "Marble counter", value: "Place the product on a clean white marble counter with soft daylight from a window, minimal lifestyle scene" },
  { label: "Studio white", value: "Replace background with a clean seamless studio white background, soft even lighting, e-commerce style" },
  { label: "Pastel gradient", value: "Replace background with a smooth pastel lilac-to-peach gradient, soft shadow under product" },
];
const AI_ANGLES = [
  { label: "Front", value: "Show the product from a clean straight-on front angle, centered, e-commerce style" },
  { label: "3/4 view", value: "Show the product from a flattering 3/4 angle, slightly elevated, soft shadow" },
  { label: "Top-down", value: "Show the product from a top-down flat lay angle, perfectly centered" },
];

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);/)?.[1] ?? "image/png";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

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
  hsn_code: "",
  gst_rate: 12,
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
          placeholder={placeholder ?? "Type and press Enter"} className="flex-1" />
        <Button type="button" variant="outline" size="sm" onClick={add}>Add</Button>
      </div>
    </div>
  );
}

// ── Size rows ─────────────────────────────────────────────────────────────────
function SizeRows({ sizes, onChange }: { sizes: ProductSize[]; onChange: (s: ProductSize[]) => void }) {
  const addRow = () => onChange([...sizes, { label: "", stock: 0 }]);
  const removeRow = (i: number) => onChange(sizes.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof ProductSize, val: string | number) =>
    onChange(sizes.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5"><Ruler className="h-4 w-4" /> Size variants</Label>
      <p className="text-xs text-muted-foreground">When sizes are added, total stock = sum of all size stocks.</p>
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

// ── Multi-image uploader (with AI editing) ────────────────────────────────────
function MultiImageUploader({ images, onChange }: { images: string[]; onChange: (imgs: string[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // AI editing state
  const [aiIndex, setAiIndex] = useState<number | null>(null);
  const [provider, setProvider] = useState<"openai" | "gemini">("openai");
  const [prompt, setPrompt] = useState("");
  const [processing, setProcessing] = useState(false);

  const upload = async (files: FileList) => {
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) { const { url } = await uploadFile(f); urls.push(url); }
      onChange([...images, ...urls]);
      toast.success(`${urls.length} image${urls.length > 1 ? "s" : ""} uploaded`);
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  };

  const removeAt = (i: number) => {
    onChange(images.filter((_, idx) => idx !== i));
    if (aiIndex === i) setAiIndex(null);
    else if (aiIndex !== null && i < aiIndex) setAiIndex(aiIndex - 1);
  };

  const runAiEdit = async () => {
    if (aiIndex === null) return;
    if (!prompt.trim()) { toast.error("Pick a preset or write a prompt first"); return; }
    setProcessing(true);
    try {
      const data = await apiFetch("/api/ai/image-edit", {
        method: "POST",
        body: JSON.stringify({ image_url: images[aiIndex], prompt, provider }),
      });
      if (!data?.image_base64) throw new Error("No image returned");
      const blob = dataUrlToBlob(data.image_base64);
      const { url } = await uploadFile(blob, `ai-edit-${Date.now()}.png`);
      onChange(images.map((u, idx) => (idx === aiIndex ? url : u)));
      toast.success("Image updated ✨");
      setPrompt("");
    } catch (e: any) {
      toast.error(e.message || "Edit failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5"><ImagePlus className="h-4 w-4" /> Product images</Label>
      <p className="text-xs text-muted-foreground">
        First image is the primary. Hover an image for AI editing. Drag-to-reorder not yet supported.
      </p>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <div key={url + i}
              className={cn(
                "relative h-20 w-20 rounded-lg overflow-hidden border group",
                aiIndex === i ? "border-primary ring-2 ring-primary/40" : "border-border"
              )}>
              <img src={url} alt={`Image ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute top-0.5 left-0.5 bg-primary text-primary-foreground text-[9px] px-1 rounded">Primary</span>
              )}
              <div className="absolute top-0.5 right-0.5 hidden group-hover:flex gap-0.5">
                <button type="button" title="AI edit"
                  onClick={() => { setAiIndex(i); setPrompt(""); }}
                  className="h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-primary">
                  <Wand2 className="h-3 w-3" />
                </button>
                <button type="button" title="Remove"
                  onClick={() => removeAt(i)}
                  className="h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-destructive">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:bg-muted transition-colors">
        <Upload className="h-6 w-6 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{uploading ? "Uploading…" : "Click to upload (multiple allowed)"}</span>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => e.target.files?.length && upload(e.target.files)} />
      </label>

      {/* AI editing panel */}
      {aiIndex !== null && images[aiIndex] && (
        <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Wand2 className="h-4 w-4" /> AI edit — image {aiIndex + 1}
            </span>
            <button type="button" onClick={() => setAiIndex(null)}
              className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Provider toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Engine</span>
            <div className="flex gap-0.5 p-0.5 bg-muted rounded-lg">
              {(["openai", "gemini"] as const).map((pv) => (
                <button key={pv} type="button" onClick={() => setProvider(pv)}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-md font-medium transition-colors",
                    provider === pv ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}>
                  {pv === "openai" ? "OpenAI" : "Gemini"}
                </button>
              ))}
            </div>
          </div>

          {/* Preview with processing overlay */}
          <div className="relative h-28 w-28 rounded-lg overflow-hidden border border-border bg-muted">
            <img src={images[aiIndex]} alt="" className="h-full w-full object-cover" />
            {processing && (
              <div className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
            )}
          </div>

          {/* Background presets */}
          <div className="space-y-1">
            <Label className="text-xs">Background</Label>
            <div className="flex flex-wrap gap-1">
              {AI_BACKGROUNDS.map((p) => (
                <Badge key={p.label} variant="outline"
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => setPrompt(p.value)}>
                  {p.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Angle presets */}
          <div className="space-y-1">
            <Label className="text-xs">Angle / framing</Label>
            <div className="flex flex-wrap gap-1">
              {AI_ANGLES.map((p) => (
                <Badge key={p.label} variant="outline"
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => setPrompt(p.value)}>
                  {p.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Custom prompt + apply */}
          <div className="flex gap-2">
            <Input value={prompt} onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the edit, or pick a preset…" className="flex-1" />
            <Button type="button" size="sm" onClick={runAiEdit} disabled={processing}>
              {processing ? "Editing…" : "Apply"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            The edited result replaces this image. The original stays until you apply.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Product form inside the drawer ────────────────────────────────────────────
function ProductForm({ form, setField, onSubmit, editingId, sku, onCancel }: {
  form: FormState;
  setField: <K extends keyof FormState>(key: K, val: FormState[K]) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  editingId: string | null;
  sku: string;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-6 pb-8">
      {editingId && sku && (
        <p className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded w-fit">SKU: {sku}</p>
      )}
      <div className="space-y-4">
        <div>
          <Label>Product name *</Label>
          <Input value={form.name} onChange={(e) => setField("name", e.target.value)}
            required placeholder="Starry Night Mini Lamp" className="mt-1.5" />
        </div>
        <div>
          <Label>Short description <span className="text-muted-foreground font-normal">(shown on card)</span></Label>
          <Textarea value={form.short_description}
            onChange={(e) => setField("short_description", e.target.value)}
            rows={2} maxLength={300} placeholder="One-line summary shown under the product name" className="mt-1.5" />
          <p className="text-xs text-muted-foreground mt-1 text-right">{form.short_description.length}/300</p>
        </div>
        <div>
          <Label>Full description</Label>
          <Textarea value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            rows={4} maxLength={2000}
            placeholder="Detailed product description, materials, care instructions, etc." className="mt-1.5" />
          <p className="text-xs text-muted-foreground mt-1 text-right">{form.description.length}/2000</p>
        </div>
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Price (₹) *</Label>
          <Input type="number" step="0.01" min="0" value={form.price}
            onChange={(e) => setField("price", parseFloat(e.target.value) || 0)} required className="mt-1.5" />
        </div>
        <div>
          <Label>Discount %</Label>
          <Input type="number" min="0" max="100" value={form.discount_percent}
            onChange={(e) => setField("discount_percent", parseInt(e.target.value) || 0)} className="mt-1.5" />
        </div>
        <div>
          <Label>Category *</Label>
          <Input value={form.category} onChange={(e) => setField("category", e.target.value)}
            placeholder="stationery / toys / quirky" required className="mt-1.5" />
        </div>
        <div>
          <Label>Stock {form.sizes.length > 0 && <span className="text-muted-foreground font-normal">(auto)</span>}</Label>
          <Input type="number" min="0"
            value={form.sizes.length > 0 ? form.sizes.reduce((s, sz) => s + sz.stock, 0) : form.stock}
            disabled={form.sizes.length > 0}
            onChange={(e) => setField("stock", parseInt(e.target.value) || 0)} className="mt-1.5" />
        </div>
      </div>
      <Separator />
      <MultiImageUploader images={form.images} onChange={(imgs) => setField("images", imgs)} />
      <Separator />
      <div className="space-y-4">
        <ChipInput label="Colors" icon={<span className="text-sm">🎨</span>}
          values={form.colors} onChange={(v) => setField("colors", v)} placeholder="sakura pink, sky blue…" />
        <ChipInput label="Tags" icon={<Tag className="h-4 w-4" />}
          values={form.tags} onChange={(v) => setField("tags", v)} placeholder="kawaii, gift, pastel…" />
      </div>
      <SizeRows sizes={form.sizes} onChange={(v) => setField("sizes", v)} />
      <Separator />
      {/* GST / Tax fields */}
      <div>
        <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">GST &amp; Tax</Label>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div>
            <Label>HSN Code</Label>
            <Input value={(form as any).hsn_code || ""} onChange={(e) => setField("hsn_code", e.target.value)}
              placeholder="e.g. 4820, 9503" className="mt-1.5 font-mono" maxLength={8} />
            <p className="text-xs text-muted-foreground mt-1">Harmonised System Nomenclature code (legally required on invoice)</p>
          </div>
          <div>
            <Label>GST Rate (%)</Label>
            <select
              value={(form as any).gst_rate ?? 12}
              onChange={(e) => setField("gst_rate", Number(e.target.value))}
              className="w-full h-10 mt-1.5 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {[0, 5, 12, 18, 28].map((r) => (
                <option key={r} value={r}>{r}% {r === 12 ? "(Stationery/Toys/default)" : r === 18 ? "(Electronics/Lamps)" : r === 5 ? "(Basic items)" : r === 0 ? "(Exempt)" : "(Luxury)"}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <Separator />
      <div className="flex gap-3 flex-wrap pt-2">
        <Button type="submit" size="lg" className="flex-1">{editingId ? "Save changes" : "Add product"}</Button>
        {editingId && <Button type="button" variant="outline" size="lg" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}

// ── Inline product detail panel ───────────────────────────────────────────────
function ProductDetailPanel({ p, onEdit, onToggle, onDelete }: {
  p: Product;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [activeImg, setActiveImg] = useState(0);
  const images = p.images?.length ? p.images : (p.image_url ? [p.image_url] : []);
  const discountedPrice = p.discount_percent > 0
    ? Math.round(p.price * (1 - p.discount_percent / 100))
    : null;

  const stockStatus = p.stock === 0
    ? { label: "Out of stock", cls: "bg-red-100 text-red-700 border-red-200" }
    : p.stock <= (p.reorder_point ?? 5)
    ? { label: "Low stock", cls: "bg-amber-100 text-amber-700 border-amber-200" }
    : { label: "In stock", cls: "bg-green-100 text-green-700 border-green-200" };

  return (
    <div className="border-t border-border bg-muted/30 px-4 py-5 animate-in slide-in-from-top-2 duration-200">
      <div className="grid md:grid-cols-3 gap-6">

        {/* Left – image gallery */}
        <div className="space-y-2">
          <div className="aspect-square rounded-xl overflow-hidden bg-muted border border-border">
            {images.length > 0
              ? <img src={images[activeImg]} alt={p.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Package className="h-10 w-10 opacity-30" />
                </div>
            }
          </div>
          {images.length > 1 && (
            <div className="flex gap-1.5 flex-wrap">
              {images.map((url, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`h-12 w-12 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === activeImg ? "border-primary" : "border-border"
                  }`}>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {images.length === 0 && (
            <p className="text-xs text-muted-foreground text-center">No images uploaded</p>
          )}
        </div>

        {/* Middle – core details */}
        <div className="space-y-4">
          {/* Name + status */}
          <div>
            <div className="flex items-start gap-2 flex-wrap">
              <h3 className="text-lg font-bold leading-tight">{p.name}</h3>
              <Badge variant="outline" className={`text-[10px] border ${stockStatus.cls} shrink-0 mt-0.5`}>
                {stockStatus.label}
              </Badge>
              {!p.is_active && (
                <Badge variant="outline" className="text-[10px] border border-border text-muted-foreground shrink-0 mt-0.5">
                  Hidden
                </Badge>
              )}
            </div>
            {p.sku && (
              <p className="text-xs font-mono text-muted-foreground mt-1">SKU: {p.sku}</p>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            {discountedPrice ? (
              <>
                <span className="text-2xl font-bold">₹{discountedPrice.toLocaleString("en-IN")}</span>
                <span className="text-sm text-muted-foreground line-through">₹{p.price.toLocaleString("en-IN")}</span>
                <Badge className="bg-destructive text-destructive-foreground text-xs">-{p.discount_percent}%</Badge>
              </>
            ) : (
              <span className="text-2xl font-bold">₹{p.price.toLocaleString("en-IN")}</span>
            )}
          </div>

          {/* Short description */}
          {p.short_description && (
            <p className="text-sm text-muted-foreground">{p.short_description}</p>
          )}

          {/* Category */}
          <div className="flex gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Category</p>
              <p className="capitalize">{p.category.replace(/-/g, " ")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Total stock</p>
              <p className="font-semibold">{p.stock} units</p>
            </div>
          </div>

          {/* Colors */}
          {p.colors && p.colors.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1.5">Colors</p>
              <div className="flex flex-wrap gap-1.5">
                {p.colors.map((c) => (
                  <Badge key={c} variant="secondary" className="capitalize">{c}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {p.tags && p.tags.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1.5">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {p.tags.map((t) => (
                  <span key={t} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">#{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right – description + sizes + actions */}
        <div className="space-y-4">
          {/* Full description */}
          {p.description ? (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1.5">Description</p>
              <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line line-clamp-6">
                {p.description}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No description added.</p>
          )}

          {/* Size variants */}
          {p.sizes && p.sizes.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1.5">Size variants</p>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="grid grid-cols-2 bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                  <span>Size</span>
                  <span className="text-right">Stock</span>
                </div>
                {p.sizes.map((sz, i) => (
                  <div key={i} className="grid grid-cols-2 px-3 py-2 border-t border-border text-sm">
                    <span className="font-medium">{sz.label}</span>
                    <span className={`text-right font-semibold ${sz.stock === 0 ? "text-red-500" : sz.stock <= 5 ? "text-amber-600" : "text-green-700"}`}>
                      {sz.stock}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reorder point */}
          {p.reorder_point != null && (
            <p className="text-xs text-muted-foreground">
              Reorder point: <span className="font-medium text-foreground">{p.reorder_point} units</span>
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2 flex-wrap">
            <Button size="sm" onClick={onEdit} className="flex-1">
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
            <Button size="sm" variant="outline" onClick={onToggle}>
              {p.is_active
                ? <><EyeOff className="h-3.5 w-3.5 mr-1.5" /> Hide</>
                : <><Eye className="h-3.5 w-3.5 mr-1.5" /> Show</>
              }
            </Button>
            <Button size="sm" variant="outline" onClick={onDelete}
              className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive hover:bg-destructive/5">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
            </Button>
          </div>
        </div>
      </div>
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const reset = () => { setForm(emptyForm); setEditingId(null); setDrawerOpen(false); };

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
      hsn_code: (form as any).hsn_code || null,
      gst_rate: Number((form as any).gst_rate) || 12,
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
      hsn_code: p.hsn_code ?? "",
      gst_rate: p.gst_rate ?? 12,
    });
    setDrawerOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    try {
      await apiFetch(`/api/products/${id}`, { method: "DELETE" });
      toast.success("Deleted");
      if (expandedId === id) setExpandedId(null);
      load();
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
            <p className="text-muted-foreground mb-4">Your account ({user?.email}) is signed in but is not an admin.</p>
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
          <main className="container py-8 space-y-8">

            {/* Header */}
            <div className="flex items-end justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-4xl font-bold">Products</h1>
                <p className="text-muted-foreground mt-1">
                  {itemsLoading ? "Loading…" : `${items.length} product${items.length !== 1 ? "s" : ""} in catalog`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="lg" onClick={() => router.push("/admin/bulk")}>
                  <Upload className="h-4 w-4 mr-2" /> Bulk Upload
                </Button>
                <Button size="lg" onClick={() => { setForm(emptyForm); setEditingId(null); setDrawerOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Add product
                </Button>
              </div>
            </div>

            {/* Product list */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">
                All products ({itemsLoading ? "…" : items.length})
              </h2>
              {itemsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-xl" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground mb-4">No products yet.</p>
                  <Button onClick={() => { setForm(emptyForm); setEditingId(null); setDrawerOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Add your first product
                  </Button>
                </Card>
              ) : items.map((p) => {
                const imgSrc = p.images?.[0] ?? p.image_url;
                const isExpanded = expandedId === p.id;
                return (
                  <Card key={p.id} className="overflow-hidden">
                    {/* Row – click to expand */}
                    <div
                      className="p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/40 transition-colors select-none"
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    >
                      <div className="h-14 w-14 rounded-xl bg-muted overflow-hidden shrink-0 border border-border">
                        {imgSrc
                          ? <img src={imgSrc} alt={p.name} className="h-full w-full object-cover" />
                          : <div className="h-full w-full flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground/40" />
                            </div>
                        }
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

                      {/* Quick actions — stop propagation so they don't toggle expand */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => toggle(p)} className="text-xs hidden sm:flex">
                          {p.is_active ? "Hide" : "Show"}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => edit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                    </div>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <ProductDetailPanel
                        p={p}
                        onEdit={() => edit(p)}
                        onToggle={() => toggle(p)}
                        onDelete={() => remove(p.id)}
                      />
                    )}
                  </Card>
                );
              })}
            </div>
          </main>
        </div>
      </div>

      {/* ── Add / Edit product drawer ───────────────────────────────── */}
      <Sheet open={drawerOpen} onOpenChange={(open) => { if (!open) reset(); }}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <SheetTitle className="text-xl">
              {editingId ? "Edit product" : "Add new product"}
            </SheetTitle>
            <SheetDescription>
              {editingId
                ? "Update the product details below and save."
                : "Fill in the details to add a new product to your catalog."}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 px-6 pt-6">
            <ProductForm
              form={form}
              setField={setField}
              onSubmit={save}
              editingId={editingId}
              sku={form.sku}
              onCancel={reset}
            />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </SidebarProvider>
  );
}
