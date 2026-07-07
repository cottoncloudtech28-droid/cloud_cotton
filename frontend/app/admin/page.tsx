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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { formatDescription } from "@/lib/formatText";
import {
  Pencil, Trash2, Plus, Upload, X, ImagePlus, Tag, Ruler,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Package, Eye, EyeOff, Wand2, Sparkles, Star,
  ZoomIn, ZoomOut, Download, RefreshCw,
} from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";
import { apiFetch, uploadFile, getCategories, bulkDeleteProducts, bulkEditProducts } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Product, ProductSize, ProductColor, ProductCharacter, Category, SpecField, ProductSpec } from "@/lib/types";

// ── AI image-editing presets ──────────────────────────────────────────────────
const AI_BACKGROUNDS = [
  {
    label: "Cozy bookshelf nook",
    value: "Place the product in front of a warm wooden bookshelf filled with neatly stacked books in muted pastel spines, a small terracotta pot with a succulent and a vintage desk globe softly blurred to the sides, warm daylight falling from the left, the product sits on a light wood surface in the foreground in sharp focus and perfectly centered, cozy reading-nook lifestyle aesthetic, soft natural shadow beneath the product, background gently out of focus so the product stays the clear hero",
  },
  {
    label: "Kids' playroom",
    value: "Place the product on a soft pastel-toned play table inside a cozy kids' playroom, blurred plush toys (a bunny and teddy bears) and wooden alphabet blocks softly out of focus behind it, sheer white curtains and a blush-pink armchair further back, warm natural daylight, dreamy soft-focus lifestyle scene, the product itself stays sharp, centered and clearly the focal point",
  },
  {
    label: "Teen bedroom fairy lights",
    value: "Place the product on a white marble side table in a cozy bedroom scene, a wall behind draped with warm blurred fairy lights and softly out-of-focus framed photo prints, gentle golden bokeh glow, evening ambient lighting, dreamy kawaii teen-bedroom aesthetic, the product stays sharp, centered and the clear focal point against the softly blurred background",
  },
  {
    label: "Café counter with greenery",
    value: "Place the product on a warm marble café counter, softly blurred hanging potted plants and a blurred café interior with warm pendant lighting and out-of-focus patrons in the background, natural daylight spilling in from a nearby window, lifestyle editorial coffee-shop aesthetic, the product stays in sharp focus and centered in the foreground",
  },
  {
    label: "School entryway bench",
    value: "Place the product on a light wood entryway bench beside a sunlit window, softly blurred backpacks in muted colors lined up nearby and neatly folded clothing beside them, a leafy courtyard visible softly out of focus through the window, warm natural daylight, tidy back-to-school lifestyle aesthetic, the product stays sharp, centered and well-lit",
  },
  {
    label: "Minimal studio",
    value: "Place the product at the center of a clean seamless studio backdrop in a soft neutral beige-to-white gradient, smooth even softbox lighting from both sides with a gentle diffused shadow directly beneath the product, no props and no clutter, crisp premium e-commerce catalog aesthetic, the product perfectly centered, sharply in focus and evenly lit as the sole hero of the frame",
  },
  {
    label: "Marble luxury shelf",
    value: "Place the product on a polished white Carrara marble surface with soft grey veining, an elegant blurred backdrop of a champagne-gold wall and a single softly out-of-focus fresh orchid stem to one side, refined directional lighting with a subtle reflection under the product, upscale boutique luxury aesthetic, the product stays sharp, centered and clearly the premium focal point",
  },
  {
    label: "Scandinavian shelf",
    value: "Place the product on a pale birch-wood floating shelf against a matte off-white wall, a softly blurred trailing green pothos plant and a small ceramic vase out of focus to the sides, bright airy diffused daylight, clean minimalist Scandinavian interior aesthetic, gentle natural shadow beneath the product, the product stays sharp, centered and the clear focal point",
  },
  {
    label: "Garden picnic",
    value: "Place the product on a soft checkered cotton picnic blanket spread over sunlit grass, softly blurred wildflowers, a woven wicker basket and dappled greenery out of focus behind it, warm golden-hour sunlight with gentle lens flare, cheerful outdoor lifestyle aesthetic, the product stays sharp, centered and clearly in focus in the foreground",
  },
  {
    label: "Coastal beach",
    value: "Place the product on smooth pale sand near a calm turquoise shoreline, softly blurred rolling waves, a few scattered seashells and beach grass out of focus behind it, bright airy sunlight with a fresh breezy feel, relaxed coastal summer aesthetic, soft natural shadow on the sand, the product stays sharp, centered and the clear hero of the scene",
  },
  {
    label: "Festive Diwali",
    value: "Place the product on a rich silk fabric surface surrounded by softly blurred glowing diyas, marigold flowers and warm fairy lights out of focus behind it, gentle golden bokeh and a warm celebratory glow, elegant Indian festive Diwali aesthetic, the product stays sharp, centered and clearly the focal point against the softly blurred festive background",
  },
  {
    label: "Cozy Christmas",
    value: "Place the product on a rustic wooden surface beside a softly blurred decorated Christmas tree with warm twinkling lights, pine sprigs, a red ribbon and out-of-focus wrapped gifts behind it, warm cozy golden bokeh, festive holiday lifestyle aesthetic, the product stays sharp, centered and the clear hero against the softly blurred holiday background",
  },
  {
    label: "Home office desk",
    value: "Place the product on a clean light-oak desk beside a softly blurred laptop, a small potted succulent, a stack of notebooks and a warm desk lamp out of focus behind it, bright natural daylight from a nearby window, tidy modern work-from-home aesthetic, gentle shadow beneath the product, the product stays sharp, centered and clearly in focus",
  },
  {
    label: "Boho macramé",
    value: "Place the product on a woven jute surface against a softly blurred cream macramé wall hanging, trailing green plants and warm terracotta pottery out of focus to the sides, warm earthy natural daylight, relaxed bohemian lifestyle aesthetic, soft natural shadow beneath the product, the product stays sharp, centered and the clear focal point",
  },
];
const AI_ANGLES = [
  { label: "Front", value: "Show the product from a clean straight-on front angle, perfectly centered, e-commerce style, soft even lighting" },
  { label: "3/4 view", value: "Show the product from a flattering 3/4 angle, slightly elevated perspective, soft drop shadow, lifestyle feel" },
  { label: "Top-down", value: "Flat lay top-down view of the product, perfectly centered on a pastel or marble surface, editorial style" },
  { label: "Close-up detail", value: "Tight close-up of the product highlighting its texture and fine detail, shallow depth of field, sharp focus on the material, soft even lighting" },
  { label: "Low angle hero", value: "Show the product from a slightly low hero angle looking up, making it feel bold and premium, soft drop shadow and even lighting, centered" },
  { label: "Side profile", value: "Show the product from a clean side profile angle, centered, revealing its full silhouette, e-commerce style, soft even lighting" },
];
const AI_STYLES = [
  {
    label: "Cotton Cloud style",
    value: (name: string) =>
      `Aesthetic lifestyle product photo of ${name}. Soft pastel room background with warm fairy lights bokeh. Product placed on a white marble surface, centered and well-lit with natural diffused light. Dreamy, kawaii e-commerce aesthetic. Vibrant product colors preserved. No text, no watermark. 1:1 square crop, high resolution.`,
  },
  {
    label: "Kawaii studio",
    value: (name: string) =>
      `Studio product photo of ${name}, centered 3/4 angle, soft diffused lighting, seamless pastel-pink background (#FDE7F1), subtle drop shadow, kawaii aesthetic, true-to-life colors, 1:1 square, no text, no watermark.`,
  },
  {
    label: "Lifestyle flat lay",
    value: (name: string) =>
      `Flat lay lifestyle photo of ${name} from directly above. Arranged on a light pastel background with minimal props — dried flowers, washi tape, or small stationery items around it. Soft natural window light, editorial aesthetic. No text, no watermark.`,
  },
  {
    label: "Clean white catalog",
    value: (name: string) =>
      `Clean e-commerce catalog photo of ${name} on a pure seamless white background (#FFFFFF), centered straight-on, bright even studio lighting, soft natural shadow beneath, true-to-life colors, crisp and sharp, 1:1 square, no props, no text, no watermark.`,
  },
  {
    label: "Premium marble",
    value: (name: string) =>
      `Premium product photo of ${name} on a polished white marble surface with soft grey veining, elegant champagne-gold blurred backdrop, refined directional lighting with a subtle reflection beneath, upscale boutique aesthetic, true-to-life colors, 1:1 square, no text, no watermark.`,
  },
  {
    label: "Festive glow",
    value: (name: string) =>
      `Warm festive product photo of ${name} on a rich silk surface surrounded by softly blurred glowing diyas, marigold flowers and golden fairy-light bokeh, celebratory Indian festive aesthetic, product centered and sharply in focus, vibrant true-to-life colors, 1:1 square, no text, no watermark.`,
  },
];

// Combine what the user has already typed with a clicked preset so presets add to
// (rather than wipe) any custom text. Avoids duplicating a preset that's already there.
const appendPrompt = (current: string, preset: string) => {
  const base = current.trim();
  if (!base) return preset;
  if (base.includes(preset)) return base;
  return `${base.replace(/[.\s]+$/, "")}. ${preset}`;
};

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
  colors: z.array(z.object({ label: z.string().min(1), stock: z.number().int().min(0), images: z.array(z.string()).optional() })).optional(),
  characters: z.array(z.object({ label: z.string().min(1), stock: z.number().int().min(0), images: z.array(z.string()).optional() })).optional(),
  tags: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  sizes: z.array(z.object({ label: z.string().min(1), stock: z.number().int().min(0) })).optional(),
  sku: z.string().trim().max(40).optional(),
});

const emptyForm = {
  name: "", short_description: "", description: "",
  price: 0, discount_percent: 0,
  category: "stationery", stock: 0,
  colors: [] as ProductColor[],
  characters: [] as ProductCharacter[],
  tags: [] as string[],
  images: [] as string[],
  sizes: [] as ProductSize[],
  sku: "",
  hsn_code: "",
  gst_rate: 12,
  // Spec values keyed by the category spec-field key. Serialized to ProductSpec[] on save.
  specifications: {} as Record<string, string | number | boolean>,
};

type FormState = typeof emptyForm;

// Combine a category's spec-field definitions with the admin-entered values into the
// snapshotted ProductSpec[] we persist. Empty/unset values are dropped.
function buildSpecs(specFields: SpecField[], values: Record<string, string | number | boolean>): ProductSpec[] {
  return (specFields ?? [])
    .map((f) => ({ key: f.key, label: f.label, type: f.type, unit: f.unit || "", value: values[f.key] }))
    .filter((s) => {
      if (s.type === "boolean") return s.value === true; // only store features the product actually has
      return s.value !== undefined && s.value !== null && String(s.value).trim() !== "";
    })
    .map((s) => ({ ...s, value: s.value as string | number | boolean }));
}

// Client-side SKU suggestion — mirrors the backend's own auto-gen format (KCS-{CATEGORY}-{RANDOM})
// so what the admin sees while adding a product matches what actually gets saved.
function generateSku(category: string): string {
  const prefix = (category || "GEN").replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase() || "GEN";
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `KCS-${prefix}-${rand}`;
}

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
            onFocus={(e) => e.target.select()}
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

// ── Color rows ────────────────────────────────────────────────────────────────
function ColorRows({ colors, onChange, images = [] }: { colors: ProductColor[]; onChange: (c: ProductColor[]) => void; images?: string[] }) {
  const addRow = () => onChange([...colors, { label: "", stock: 0, images: [] }]);
  const removeRow = (i: number) => onChange(colors.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof ProductColor, val: string | number) =>
    onChange(colors.map((c, idx) => idx === i ? { ...c, [field]: val } : c));
  const toggleImage = (i: number, url: string) =>
    onChange(colors.map((c, idx) => {
      if (idx !== i) return c;
      const current = c.images ?? [];
      const next = current.includes(url) ? current.filter((u) => u !== url) : [...current, url];
      return { ...c, images: next };
    }));
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5"><span className="text-sm">🎨</span> Colors</Label>
      <p className="text-xs text-muted-foreground">Each color tracks its own stock, so a color can sell out on its own. Pick which uploaded images belong to a color — selecting that color will then switch the gallery to those images.</p>
      {colors.map((c, i) => (
        <div key={i} className="space-y-1.5 rounded-lg border border-border p-2">
          <div className="flex gap-2 items-center">
            <Input value={c.label} onChange={(e) => update(i, "label", e.target.value)}
              placeholder="e.g. sakura pink" className="flex-1" />
            <Input type="number" min="0" value={c.stock}
              onFocus={(e) => e.target.select()}
              onChange={(e) => update(i, "stock", parseInt(e.target.value) || 0)}
              placeholder="Stock" className="w-24" />
            <button type="button" onClick={() => removeRow(i)}
              className="text-muted-foreground hover:text-destructive transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          {images.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {images.map((url, idx) => {
                const active = (c.images ?? []).includes(url);
                return (
                  <button key={url + idx} type="button" title={active ? "Linked to this color — click to unlink" : "Click to link to this color"}
                    onClick={() => toggleImage(i, url)}
                    className={cn(
                      "h-10 w-10 rounded-md overflow-hidden border-2 transition-colors",
                      active ? "border-primary ring-2 ring-primary/40" : "border-border opacity-50 hover:opacity-100"
                    )}>
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Add color
      </Button>
    </div>
  );
}

// ── Character/design rows ──────────────────────────────────────────────────────
function CharacterRows({ characters, onChange, images = [] }: { characters: ProductCharacter[]; onChange: (c: ProductCharacter[]) => void; images?: string[] }) {
  const addRow = () => onChange([...characters, { label: "", stock: 0, images: [] }]);
  const removeRow = (i: number) => onChange(characters.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof ProductCharacter, val: string | number) =>
    onChange(characters.map((c, idx) => idx === i ? { ...c, [field]: val } : c));
  const toggleImage = (i: number, url: string) =>
    onChange(characters.map((c, idx) => {
      if (idx !== i) return c;
      const current = c.images ?? [];
      const next = current.includes(url) ? current.filter((u) => u !== url) : [...current, url];
      return { ...c, images: next };
    }));
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5"><span className="text-sm">🎭</span> Character / Design</Label>
      <p className="text-xs text-muted-foreground">For products that vary by print/character/design rather than color — each one tracks its own stock. Pick which uploaded images belong to it; selecting it will then switch the gallery to those images.</p>
      {characters.map((c, i) => (
        <div key={i} className="space-y-1.5 rounded-lg border border-border p-2">
          <div className="flex gap-2 items-center">
            <Input value={c.label} onChange={(e) => update(i, "label", e.target.value)}
              placeholder="e.g. Doraemon" className="flex-1" />
            <Input type="number" min="0" value={c.stock}
              onFocus={(e) => e.target.select()}
              onChange={(e) => update(i, "stock", parseInt(e.target.value) || 0)}
              placeholder="Stock" className="w-24" />
            <button type="button" onClick={() => removeRow(i)}
              className="text-muted-foreground hover:text-destructive transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          {images.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {images.map((url, idx) => {
                const active = (c.images ?? []).includes(url);
                return (
                  <button key={url + idx} type="button" title={active ? "Linked to this character/design — click to unlink" : "Click to link to this character/design"}
                    onClick={() => toggleImage(i, url)}
                    className={cn(
                      "h-10 w-10 rounded-md overflow-hidden border-2 transition-colors",
                      active ? "border-primary ring-2 ring-primary/40" : "border-border opacity-50 hover:opacity-100"
                    )}>
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Add character / design
      </Button>
    </div>
  );
}

// ── Fullscreen image lightbox: zoom, pan, prev/next, download/replace/remove ──
function ImageLightbox({
  images, index, onIndexChange, onClose, onReplace, onRemove,
}: {
  images: string[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  onReplace: (file: File) => void;
  onRemove: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [downloading, setDownloading] = useState(false);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const src = images[index];

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  useEffect(resetView, [index]);

  const goPrev = () => onIndexChange((index - 1 + images.length) % images.length);
  const goNext = () => onIndexChange((index + 1) % images.length);

  // Capture Escape/arrows here so they don't also close the Sheet drawer underneath.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); onClose(); }
      else if (e.key === "ArrowLeft" && images.length > 1) { e.stopPropagation(); e.preventDefault(); goPrev(); }
      else if (e.key === "ArrowRight" && images.length > 1) { e.stopPropagation(); e.preventDefault(); goNext(); }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, images.length]);

  const zoomBy = (delta: number) => setZoom((z) => Math.min(4, Math.max(1, +(z + delta).toFixed(2))));
  const handleWheel = (e: React.WheelEvent) => { e.preventDefault(); zoomBy(e.deltaY > 0 ? -0.25 : 0.25); };
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    setPan({ x: dragRef.current.panX + (e.clientX - dragRef.current.x), y: dragRef.current.panY + (e.clientY - dragRef.current.y) });
  };
  const handleMouseUp = () => { dragRef.current = null; };

  const download = async () => {
    setDownloading(true);
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = src.split("/").pop()?.split("?")[0] || `image-${index + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error("Download failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm select-none" onClick={onClose}>
      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
        <span className="text-white/80 text-sm font-medium">{index + 1} / {images.length}</span>
        <div className="flex items-center gap-1.5">
          <button type="button" title="Zoom out" onClick={() => zoomBy(-0.5)}
            className="h-9 w-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
            <ZoomOut className="h-4 w-4" />
          </button>
          <button type="button" title="Zoom in" onClick={() => zoomBy(0.5)}
            className="h-9 w-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button type="button" title="Download" onClick={download} disabled={downloading}
            className="h-9 w-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-50">
            <Download className="h-4 w-4" />
          </button>
          <button type="button" title="Replace image" onClick={() => replaceInputRef.current?.click()}
            className="h-9 w-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
          <input ref={replaceInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onReplace(f);
              if (replaceInputRef.current) replaceInputRef.current.value = "";
            }} />
          <button type="button" title="Remove image" onClick={onRemove}
            className="h-9 w-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-destructive transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
          <button type="button" title="Close" onClick={onClose}
            className="h-9 w-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Prev / Next */}
      {images.length > 1 && (
        <>
          <button type="button" title="Previous" onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button type="button" title="Next" onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Image */}
      <div
        className="max-h-[85vh] max-w-[92vw] overflow-hidden flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          key={index}
          src={src}
          alt={`Image ${index + 1}`}
          className={cn(
            "max-h-[85vh] max-w-[92vw] rounded-xl shadow-2xl object-contain transition-transform duration-100",
            zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
          )}
          style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }}
          onClick={(e) => { e.stopPropagation(); if (zoom === 1) zoomBy(1); }}
          draggable={false}
        />
      </div>

      {zoom > 1 && (
        <button type="button" onClick={(e) => { e.stopPropagation(); resetView(); }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/80 bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors">
          Reset zoom
        </button>
      )}
    </div>
  );
}

// ── Multi-image uploader (with AI editing) ────────────────────────────────────
function MultiImageUploader({ images, onChange, productName = "" }: { images: string[]; onChange: (imgs: string[]) => void; productName?: string }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // AI editing state
  const [aiIndex, setAiIndex] = useState<number | null>(null);
  const [provider, setProvider] = useState<"openai" | "gemini">("openai");
  const [prompt, setPrompt] = useState("");
  const [processing, setProcessing] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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
    setLightboxIndex((prev) => {
      if (prev === null) return null;
      const remaining = images.length - 1;
      if (remaining <= 0) return null;
      if (i < prev) return prev - 1;
      if (i === prev) return Math.min(prev, remaining - 1);
      return prev;
    });
  };

  const replaceAt = async (i: number, file: File) => {
    try {
      const { url } = await uploadFile(file);
      onChange(images.map((u, idx) => (idx === i ? url : u)));
      toast.success("Image replaced");
    } catch (e: any) {
      toast.error(e.message || "Replace failed");
    }
  };

  const makePrimary = (i: number) => {
    if (i === 0) return;
    onChange([images[i], ...images.filter((_, idx) => idx !== i)]);
    setAiIndex((prev) => (prev === null ? prev : prev === i ? 0 : prev < i ? prev + 1 : prev));
    toast.success("Set as primary image");
  };

  // Close only the AI edit panel on Escape, instead of letting it bubble up
  // and close the whole product drawer (which would discard the edit/generation).
  useEffect(() => {
    if (aiIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        setAiIndex(null);
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [aiIndex]);

  const runAiEdit = async (mode: "replace" | "add") => {
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
      if (mode === "add") {
        onChange([...images, url]);
        toast.success("New image added ✨");
      } else {
        onChange(images.map((u, idx) => (idx === aiIndex ? url : u)));
        toast.success("Image updated ✨");
      }
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
        First image is the primary. Hover an image to set it as primary (star), AI-edit it, or remove it — generate extra angles/backgrounds and add them as new gallery images. Drag-to-reorder not yet supported.
      </p>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <div key={url + i}
              className={cn(
                "relative h-20 w-20 rounded-lg overflow-hidden border group",
                aiIndex === i ? "border-primary ring-2 ring-primary/40" : "border-border"
              )}>
              <img src={url} alt={`Image ${i + 1}`} loading="lazy"
                className="h-full w-full object-cover cursor-zoom-in"
                onClick={() => setLightboxIndex(i)} />
              {i === 0 && (
                <span className="absolute top-0.5 left-0.5 bg-primary text-primary-foreground text-[10px] font-medium px-1.5 py-0.5 rounded">Primary</span>
              )}
              <div className="absolute top-0.5 right-0.5 hidden group-hover:flex gap-0.5">
                {i !== 0 && (
                  <button type="button" title="Set as primary"
                    onClick={() => makePrimary(i)}
                    className="h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-amber-500">
                    <Star className="h-3 w-3" />
                  </button>
                )}
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

          {/* Preview with processing overlay — click to fullscreen */}
          <div
            className="relative h-28 w-28 rounded-lg overflow-hidden border border-border bg-muted cursor-zoom-in"
            onClick={() => !processing && setLightboxIndex(aiIndex)}
            title="Click to view full size"
          >
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
                  onClick={() => setPrompt((prev) => appendPrompt(prev, p.value))}>
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
                  onClick={() => setPrompt((prev) => appendPrompt(prev, p.value))}>
                  {p.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Full style presets */}
          <div className="space-y-1">
            <Label className="text-xs">Full style</Label>
            <div className="flex flex-wrap gap-1">
              {AI_STYLES.map((p) => (
                <Badge key={p.label} variant="outline"
                  className="cursor-pointer hover:bg-primary/10 border-primary/40 text-primary"
                  onClick={() => setPrompt(p.value(productName || "this product"))}>
                  ✨ {p.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Custom prompt + apply */}
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground">Pick a preset to fill in a detailed prompt, then edit it or add your own details. Clicking more presets appends them.</p>
            <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the edit, or pick a preset above and tweak it…"
              rows={5} className="resize-y min-h-[110px] text-sm" />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1"
                onClick={() => runAiEdit("add")} disabled={processing}>
                <Plus className="h-3.5 w-3.5 mr-1" /> {processing ? "Working…" : "Add as new image"}
              </Button>
              <Button type="button" size="sm" className="flex-1"
                onClick={() => runAiEdit("replace")} disabled={processing}>
                {processing ? "Editing…" : "Replace this image"}
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            "Add as new image" generates a variant (new angle, background, etc.) and appends it to the gallery — great for quickly building out 1–2 extra shots from a single upload. "Replace" overwrites this image instead.
          </p>
        </div>
      )}

      {/* Fullscreen lightbox */}
      {lightboxIndex !== null && images[lightboxIndex] && (
        <ImageLightbox
          images={images}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onReplace={(file) => replaceAt(lightboxIndex, file)}
          onRemove={() => removeAt(lightboxIndex)}
        />
      )}
    </div>
  );
}

// ── Category picker ───────────────────────────────────────────────────────────
function CategoryPicker({ value, onChange, categories }: {
  value: string;
  onChange: (slug: string) => void;
  categories: Category[];
}) {
  if (categories.length === 0) {
    return (
      <Input value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="stationery / toys / quirky" required className="mt-1.5" />
    );
  }
  return (
    <div className="mt-1.5 grid grid-cols-3 gap-2">
      {categories.map((cat) => {
        const selected = value === cat.slug;
        return (
          <button
            key={cat.slug}
            type="button"
            onClick={() => onChange(cat.slug)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-colors hover:bg-muted/60",
              selected
                ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                : "border-border"
            )}
          >
            {cat.banner_url ? (
              <img
                src={cat.banner_url}
                alt={cat.name}
                className="h-12 w-full rounded-lg object-cover"
              />
            ) : (
              <div className="h-12 w-full rounded-lg bg-muted flex items-center justify-center text-2xl">
                {cat.emoji}
              </div>
            )}
            <span className="text-[11px] font-medium leading-tight line-clamp-1">{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Category-based specifications inputs ──────────────────────────────────────
function SpecificationsSection({ specFields, values, onChange }: {
  specFields: SpecField[];
  values: Record<string, string | number | boolean>;
  onChange: (key: string, value: string | number | boolean) => void;
}) {
  if (!specFields || specFields.length === 0) return null;
  const sorted = [...specFields].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return (
    <>
      <Separator />
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Specifications</Label>
          <p className="text-xs text-muted-foreground mt-1">Based on the selected category. Manage these fields in Admin → Categories.</p>
        </div>
        <div className="space-y-3">
          {sorted.map((f) => {
            const v = values[f.key];
            if (f.type === "boolean") {
              return (
                <div key={f.key} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                  <Label className="cursor-pointer">{f.label}</Label>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground w-6 text-right">{v === true ? "Yes" : "No"}</span>
                    <Switch checked={v === true} onCheckedChange={(c) => onChange(f.key, c)} />
                  </div>
                </div>
              );
            }
            if (f.type === "select") {
              return (
                <div key={f.key}>
                  <Label>{f.label}</Label>
                  <select value={(v as string) ?? ""} onChange={(e) => onChange(f.key, e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1.5">
                    <option value="">— Not specified —</option>
                    {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              );
            }
            if (f.type === "number") {
              return (
                <div key={f.key}>
                  <Label>{f.label}{f.unit ? <span className="text-muted-foreground font-normal"> ({f.unit})</span> : null}</Label>
                  <Input type="number" value={v === undefined || v === null ? "" : String(v)}
                    onChange={(e) => onChange(f.key, e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="—" className="mt-1.5" />
                </div>
              );
            }
            return (
              <div key={f.key}>
                <Label>{f.label}</Label>
                <Input value={(v as string) ?? ""} onChange={(e) => onChange(f.key, e.target.value)}
                  placeholder="—" className="mt-1.5" />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Product form inside the drawer ────────────────────────────────────────────
function ProductForm({ form, setField, onSubmit, editingId, onCancel, categories }: {
  form: FormState;
  setField: <K extends keyof FormState>(key: K, val: FormState[K]) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  editingId: string | null;
  onCancel: () => void;
  categories: Category[];
}) {
  // Keep the suggested SKU aligned with the chosen category while adding a new product —
  // but only while it still looks auto-generated, so a hand-typed SKU is never clobbered.
  useEffect(() => {
    if (editingId) return;
    if (!form.sku || form.sku.startsWith("KCS-")) {
      setField("sku", generateSku(form.category));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category, editingId]);

  // Transient AI-description helper — not saved on the product, just feeds the prompt.
  const [keywords, setKeywords] = useState("");
  const [describing, setDescribing] = useState(false);

  // One-click "read the photo and fill the form" — same /analyze endpoint the bulk
  // uploader uses. Only fills fields the admin hasn't already typed, so it never
  // clobbers manual edits; category is always set to the AI's best guess (editable).
  const [analyzing, setAnalyzing] = useState(false);
  const autoFillFromImage = async () => {
    if (!form.images[0]) { toast.error("Upload a product image first"); return; }
    setAnalyzing(true);
    try {
      const data = await apiFetch("/api/ai/analyze", {
        method: "POST",
        body: JSON.stringify({
          image_base64: form.images[0],
          categories: categories.map((c) => c.slug),
          backgrounds: [],
          angles: [],
        }),
      });
      if (data.name && !form.name.trim()) setField("name", data.name);
      if (data.description && !form.description.trim()) setField("description", data.description);
      if (data.price && !form.price) setField("price", Math.round(Number(data.price)) || 0);
      if (data.category && categories.some((c) => c.slug === data.category)) setField("category", data.category);
      if (Array.isArray(data.colors) && data.colors.length > 0 && form.colors.length === 0) {
        setField("colors", data.colors.map((label: string) => ({ label, stock: 0 })));
      }
      toast.success("Auto-filled from image ✨");
    } catch (e: any) {
      toast.error(e.message || "Auto-fill failed");
    } finally {
      setAnalyzing(false);
    }
  };
  const generateDescription = async () => {
    if (!form.name.trim()) { toast.error("Add a product name first"); return; }
    setDescribing(true);
    try {
      const data = await apiFetch("/api/ai/describe", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          colors: form.colors.map((c) => c.label),
          keywords,
        }),
      });
      setField("description", data.description || "");
      toast.success("Description generated ✨");
    } catch (e: any) {
      toast.error(e.message || "Description generation failed");
    } finally {
      setDescribing(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 pb-8">
      {/* AI auto-fill — reads the uploaded photo and fills name, category, colors, description & price */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> Auto-fill with AI</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {form.images[0] ? "Reads your product photo and fills the details below (only empty fields)." : "Upload a product image below, then fill the form in one click."}
          </p>
        </div>
        <Button type="button" size="sm" className="rounded-full flex-shrink-0 bg-gradient-primary text-primary-foreground border-0"
          onClick={autoFillFromImage} disabled={analyzing || !form.images[0]}>
          <Sparkles className="h-3.5 w-3.5 mr-1" /> {analyzing ? "Auto-filling…" : "Auto-fill"}
        </Button>
      </div>
      <div>
        <Label>SKU / product code</Label>
        <div className="flex gap-2 mt-1.5">
          <Input value={form.sku} onChange={(e) => setField("sku", e.target.value)}
            placeholder="KCS-CAT-XXXXX" className="font-mono" maxLength={40} />
          <Button type="button" variant="outline" size="icon"
            title="Generate a new SKU"
            onClick={() => setField("sku", generateSku(form.category))}>
            <Wand2 className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {editingId ? "Auto-filled — edit if you use your own SKU scheme." : "Auto-filled from the category. Edit freely or regenerate."}
        </p>
      </div>
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
          <div className="flex items-center justify-between gap-2">
            <Label>Full description</Label>
            <Button type="button" size="sm" variant="ghost" className="h-7 rounded-full"
              onClick={generateDescription} disabled={describing}>
              <Sparkles className="h-3 w-3 mr-1" /> {describing ? "Writing…" : "Generate with AI"}
            </Button>
          </div>
          <Input value={keywords} onChange={(e) => setKeywords(e.target.value)}
            placeholder="e.g. leak-proof, gift-ready, pastel, BPA-free" className="mt-1.5" />
          <p className="text-xs text-muted-foreground mt-1">
            Add your product keywords, features, or highlights to help AI generate the perfect description.
          </p>
          <Textarea value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            rows={4} maxLength={2000}
            placeholder="Detailed product description, materials, care instructions, etc." className="mt-2" />
          <div className="flex items-start justify-between gap-2 mt-1">
            <p className="text-[11px] text-muted-foreground">
              Tip: start a line with "- " for a bullet point, and wrap text in **double asterisks** for bold headings.
            </p>
            <p className="text-xs text-muted-foreground text-right shrink-0">{form.description.length}/2000</p>
          </div>
        </div>
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Price (₹) *</Label>
          <Input type="number" step="0.01" min="0" value={form.price}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setField("price", parseFloat(e.target.value) || 0)} required className="mt-1.5" />
        </div>
        <div>
          <Label>Discount %</Label>
          <Input type="number" min="0" max="100" value={form.discount_percent}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setField("discount_percent", parseInt(e.target.value) || 0)} className="mt-1.5" />
        </div>
        <div className="col-span-2">
          <Label>Category *</Label>
          <CategoryPicker value={form.category} onChange={(v) => setField("category", v)} categories={categories} />
        </div>
        <div>
          <Label>Stock {(form.sizes.length > 0 || form.colors.length > 0 || form.characters.length > 0) && <span className="text-muted-foreground font-normal">(auto)</span>}</Label>
          <Input type="number" min="0"
            value={
              form.sizes.length > 0 ? form.sizes.reduce((s, sz) => s + sz.stock, 0)
              : form.colors.length > 0 ? form.colors.reduce((s, c) => s + c.stock, 0)
              : form.characters.length > 0 ? form.characters.reduce((s, c) => s + c.stock, 0)
              : form.stock
            }
            disabled={form.sizes.length > 0 || form.colors.length > 0 || form.characters.length > 0}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setField("stock", parseInt(e.target.value) || 0)} className="mt-1.5" />
        </div>
      </div>
      <Separator />
      <MultiImageUploader images={form.images} onChange={(imgs) => setField("images", imgs)} productName={form.name} />
      <Separator />
      <div className="space-y-4">
        <ColorRows colors={form.colors} onChange={(v) => setField("colors", v)} images={form.images} />
        <CharacterRows characters={form.characters} onChange={(v) => setField("characters", v)} images={form.images} />
        <ChipInput label="Tags" icon={<Tag className="h-4 w-4" />}
          values={form.tags} onChange={(v) => setField("tags", v)} placeholder="kawaii, gift, pastel…" />
      </div>
      <SizeRows sizes={form.sizes} onChange={(v) => setField("sizes", v)} />
      <SpecificationsSection
        specFields={categories.find((c) => c.slug === form.category)?.spec_fields ?? []}
        values={form.specifications}
        onChange={(key, value) => setField("specifications", { ...form.specifications, [key]: value })}
      />
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
              <div className="text-sm leading-relaxed text-foreground/80 max-h-32 overflow-y-auto">
                {formatDescription(p.description)}
              </div>
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

          {/* Color variants */}
          {p.colors && p.colors.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1.5">Color variants</p>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="grid grid-cols-2 bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                  <span>Color</span>
                  <span className="text-right">Stock</span>
                </div>
                {p.colors.map((c, i) => (
                  <div key={i} className="grid grid-cols-2 px-3 py-2 border-t border-border text-sm">
                    <span className="font-medium capitalize">{c.label}</span>
                    <span className={`text-right font-semibold ${c.stock === 0 ? "text-red-500" : c.stock <= 10 ? "text-amber-600" : "text-green-700"}`}>
                      {c.stock}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Character/design variants */}
          {p.characters && p.characters.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1.5">Character / design variants</p>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="grid grid-cols-2 bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                  <span>Character / design</span>
                  <span className="text-right">Stock</span>
                </div>
                {p.characters.map((c, i) => (
                  <div key={i} className="grid grid-cols-2 px-3 py-2 border-t border-border text-sm">
                    <span className="font-medium capitalize">{c.label}</span>
                    <span className={`text-right font-semibold ${c.stock === 0 ? "text-red-500" : c.stock <= 10 ? "text-amber-600" : "text-green-700"}`}>
                      {c.stock}
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState({ category: "", price: "", stock: "", discount_percent: "", visibility: "" });

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

  useEffect(() => {
    if (!isAdmin) return;
    load();
    getCategories().then(setCategories).catch(() => {});
  }, [isAdmin]);

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
        : form.colors.length > 0
        ? form.colors.reduce((s, c) => s + c.stock, 0)
        : form.characters.length > 0
        ? form.characters.reduce((s, c) => s + c.stock, 0)
        : Number(form.stock),
    });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    const specFields = categories.find((c) => c.slug === form.category)?.spec_fields ?? [];
    const payload = {
      ...parsed.data,
      images: form.images,
      image_url: form.images[0] ?? null,
      sku: form.sku?.trim() || undefined,
      hsn_code: (form as any).hsn_code || null,
      gst_rate: Number((form as any).gst_rate) || 12,
      specifications: buildSpecs(specFields, form.specifications),
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
      characters: p.characters ?? [],
      tags: p.tags ?? [],
      images: p.images?.length ? p.images : (p.image_url ? [p.image_url] : []),
      sizes: p.sizes ?? [],
      sku: p.sku ?? "",
      hsn_code: p.hsn_code ?? "",
      gst_rate: p.gst_rate ?? 12,
      // Load saved spec values back into the keyed map so toggles/inputs pre-fill.
      specifications: Object.fromEntries((p.specifications ?? []).map((s) => [s.key, s.value as string | number | boolean])),
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

  const toggleSelect = (id: string) =>
    setSelectedIds((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const allSelected = items.length > 0 && items.every((p) => selectedIds.has(p.id));
  const toggleSelectAll = () => setSelectedIds(allSelected ? new Set() : new Set(items.map((p) => p.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} product${selectedIds.size !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    try {
      const { deleted } = await bulkDeleteProducts(Array.from(selectedIds));
      toast.success(`Deleted ${deleted} product${deleted !== 1 ? "s" : ""}`);
      if (expandedId && selectedIds.has(expandedId)) setExpandedId(null);
      clearSelection();
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const applyBulkEdit = async () => {
    const updates: { category?: string; price?: number; stock?: number; discount_percent?: number; is_active?: boolean } = {};
    if (bulkEditForm.category) updates.category = bulkEditForm.category;
    if (bulkEditForm.price) updates.price = Number(bulkEditForm.price);
    if (bulkEditForm.stock) updates.stock = Number(bulkEditForm.stock);
    if (bulkEditForm.discount_percent) updates.discount_percent = Number(bulkEditForm.discount_percent);
    if (bulkEditForm.visibility) updates.is_active = bulkEditForm.visibility === "show";
    if (Object.keys(updates).length === 0) return toast.error("Set at least one field to update");
    try {
      const { updated } = await bulkEditProducts(Array.from(selectedIds), updates);
      toast.success(`Updated ${updated} product${updated !== 1 ? "s" : ""}`);
      setBulkEditOpen(false);
      setBulkEditForm({ category: "", price: "", stock: "", discount_percent: "", visibility: "" });
      clearSelection();
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
                <Button size="lg" onClick={() => { setForm({ ...emptyForm, sku: generateSku(emptyForm.category) }); setEditingId(null); setDrawerOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Add product
                </Button>
              </div>
            </div>

            {/* Product list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  {items.length > 0 && (
                    <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all products" />
                  )}
                  <h2 className="text-xl font-semibold">
                    All products ({itemsLoading ? "…" : items.length})
                  </h2>
                </div>
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
                    <Button variant="outline" size="sm" onClick={() => setBulkEditOpen(true)}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit selected
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={bulkDelete}>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete selected
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearSelection}>Clear</Button>
                  </div>
                )}
              </div>
              {itemsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-xl" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground mb-4">No products yet.</p>
                  <Button onClick={() => { setForm({ ...emptyForm, sku: generateSku(emptyForm.category) }); setEditingId(null); setDrawerOpen(true); }}>
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
                      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                        <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} aria-label={`Select ${p.name}`} />
                      </div>
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
              onCancel={reset}
              categories={categories}
            />
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* ── Bulk edit selected products drawer ──────────────────────── */}
      <Sheet open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <SheetTitle className="text-xl">Edit {selectedIds.size} product{selectedIds.size !== 1 ? "s" : ""}</SheetTitle>
            <SheetDescription>Only fields you set here will be changed. Leave a field blank to keep each product's current value.</SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 px-6 pt-6">
            <div className="space-y-4 pb-6">
              <div>
                <Label>Category</Label>
                <select
                  value={bulkEditForm.category}
                  onChange={(e) => setBulkEditForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full h-10 mt-1.5 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— No change —</option>
                  {categories.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Visibility</Label>
                <select
                  value={bulkEditForm.visibility}
                  onChange={(e) => setBulkEditForm((f) => ({ ...f, visibility: e.target.value }))}
                  className="w-full h-10 mt-1.5 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— No change —</option>
                  <option value="show">Show</option>
                  <option value="hide">Hide</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price (₹)</Label>
                  <Input type="number" placeholder="No change" value={bulkEditForm.price}
                    onChange={(e) => setBulkEditForm((f) => ({ ...f, price: e.target.value }))} className="mt-1.5" />
                </div>
                <div>
                  <Label>Stock</Label>
                  <Input type="number" placeholder="No change" value={bulkEditForm.stock}
                    onChange={(e) => setBulkEditForm((f) => ({ ...f, stock: e.target.value }))} className="mt-1.5" />
                </div>
              </div>
              <div>
                <Label>Discount (%)</Label>
                <Input type="number" placeholder="No change" value={bulkEditForm.discount_percent}
                  onChange={(e) => setBulkEditForm((f) => ({ ...f, discount_percent: e.target.value }))} className="mt-1.5" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setBulkEditOpen(false)}>Cancel</Button>
                <Button className="flex-1" onClick={applyBulkEdit}>Apply to {selectedIds.size}</Button>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </SidebarProvider>
  );
}
