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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Wand2, Trash2, Sparkles, RotateCcw } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";
import { DescriptionToolbar } from "@/components/admin/DescriptionEditor";
import { apiFetch, uploadFile, getCategories } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

type Row = {
  id: string; file: File; originalDataUrl: string; currentDataUrl: string;
  editing: boolean; describing: boolean; analyzing: boolean; name: string; description: string;
  descKeywords: string;
  price: string; category: string; stock: string; colorsText: string; charactersText: string;
  bgPrompt: string; anglePrompt: string; provider: "openai" | "gemini";
};

const PRESET_BACKGROUNDS = [
  { label: "Cozy bookshelf nook", value: "Place the product in front of a warm wooden bookshelf filled with neatly stacked books in muted pastel spines, a small terracotta pot with a succulent and a vintage desk globe softly blurred to the sides, warm daylight falling from the left, the product sits on a light wood surface in the foreground in sharp focus and perfectly centered, cozy reading-nook lifestyle aesthetic, soft natural shadow beneath the product, background gently out of focus so the product stays the clear hero" },
  { label: "Kids' playroom", value: "Place the product on a soft pastel-toned play table inside a cozy kids' playroom, blurred plush toys (a bunny and teddy bears) and wooden alphabet blocks softly out of focus behind it, sheer white curtains and a blush-pink armchair further back, warm natural daylight, dreamy soft-focus lifestyle scene, the product itself stays sharp, centered and clearly the focal point" },
  { label: "Teen bedroom fairy lights", value: "Place the product on a white marble side table in a cozy bedroom scene, a wall behind draped with warm blurred fairy lights and softly out-of-focus framed photo prints, gentle golden bokeh glow, evening ambient lighting, dreamy kawaii teen-bedroom aesthetic, the product stays sharp, centered and the clear focal point against the softly blurred background" },
  { label: "Café counter with greenery", value: "Place the product on a warm marble café counter, softly blurred hanging potted plants and a blurred café interior with warm pendant lighting and out-of-focus patrons in the background, natural daylight spilling in from a nearby window, lifestyle editorial coffee-shop aesthetic, the product stays in sharp focus and centered in the foreground" },
  { label: "Marble luxury shelf", value: "Place the product on a polished white Carrara marble surface with soft grey veining, an elegant blurred backdrop of a champagne-gold wall and a single softly out-of-focus fresh orchid stem to one side, refined directional lighting with a subtle reflection under the product, upscale boutique luxury aesthetic, the product stays sharp, centered and clearly the premium focal point" },
  { label: "Scandinavian shelf", value: "Place the product on a pale birch-wood floating shelf against a matte off-white wall, a softly blurred trailing green pothos plant and a small ceramic vase out of focus to the sides, bright airy diffused daylight, clean minimalist Scandinavian interior aesthetic, gentle natural shadow beneath the product, the product stays sharp, centered and the clear focal point" },
  { label: "Garden picnic", value: "Place the product on a soft checkered cotton picnic blanket spread over sunlit grass, softly blurred wildflowers, a woven wicker basket and dappled greenery out of focus behind it, warm golden-hour sunlight with gentle lens flare, cheerful outdoor lifestyle aesthetic, the product stays sharp, centered and clearly in focus in the foreground" },
  { label: "Coastal beach", value: "Place the product on smooth pale sand near a calm turquoise shoreline, softly blurred rolling waves, a few scattered seashells and beach grass out of focus behind it, bright airy sunlight with a fresh breezy feel, relaxed coastal summer aesthetic, soft natural shadow on the sand, the product stays sharp, centered and the clear hero of the scene" },
  { label: "Cozy Christmas", value: "Place the product on a rustic wooden surface beside a softly blurred decorated Christmas tree with warm twinkling lights, pine sprigs, a red ribbon and out-of-focus wrapped gifts behind it, warm cozy golden bokeh, festive holiday lifestyle aesthetic, the product stays sharp, centered and the clear hero against the softly blurred holiday background" },
  { label: "Home office desk", value: "Place the product on a clean light-oak desk beside a softly blurred laptop, a small potted succulent, a stack of notebooks and a warm desk lamp out of focus behind it, bright natural daylight from a nearby window, tidy modern work-from-home aesthetic, gentle shadow beneath the product, the product stays sharp, centered and clearly in focus" },
  { label: "Boho macramé", value: "Place the product on a woven jute surface against a softly blurred cream macramé wall hanging, trailing green plants and warm terracotta pottery out of focus to the sides, warm earthy natural daylight, relaxed bohemian lifestyle aesthetic, soft natural shadow beneath the product, the product stays sharp, centered and the clear focal point" },
  { label: "School stationery bokeh", value: "Place the product against a minimalist, premium school-inspired background with soft neutral and pastel colors — off-white, warm beige, light sage green, muted sky blue and soft gray — only subtle educational elements like a neatly stacked notebook, a pencil, a small backpack or simple geometric shapes kept distant and softly blurred, realistic shallow depth of field with smooth bokeh, soft diffused natural lighting, matte textures, modern Scandinavian-inspired aesthetic, uncluttered premium commercial composition, a spacious clean central area around the product, ultra-realistic, 8K, no people, no text, no logos, no watermark, the product stays sharp, centered and the clear focal point" },
  { label: "School luxury catalog", value: "Place the product against a minimalist, premium school-inspired background with soft neutral and pastel colors — off-white, warm beige, light sage green, muted sky blue and soft gray — only subtle educational elements like a neatly stacked notebook, a pencil, a small backpack or simple geometric shapes kept distant and softly blurred, realistic shallow depth of field with smooth bokeh, soft diffused natural lighting, matte textures, modern Scandinavian-inspired aesthetic, uncluttered premium commercial composition, a spacious clean central area around the product, ultra-realistic, 8K, no people, no text, no logos, no watermark, the product stays sharp, centered and the clear focal point, luxury e-commerce product photography, seamless gradient backdrop, soft shadows, subtle depth, elegant negative space, muted color palette, refined minimalism, high-end brand aesthetic" },
  { label: "Modern gym interior", value: "Place the product in a high-end modern gym interior with sleek workout equipment, dumbbells, barbells, benches, mirrors, rubber flooring and industrial concrete textures softly blurred behind it with realistic shallow depth of field and bokeh, subtle LED lighting, dramatic yet balanced cool gray, black and metallic tones accented with subtle blue or warm amber highlights, luxurious, energetic and professional feel, ultra-realistic, 8K, studio-quality soft cinematic lighting, a clean well-lit central area around the product, no people, no text, no logos, the product stays sharp, centered and the clear focal point" },
  { label: "Moody luxury gym", value: "Place the product in a high-end modern gym interior with sleek workout equipment, dumbbells, barbells, benches, mirrors, rubber flooring and industrial concrete textures softly blurred behind it with realistic shallow depth of field and bokeh, subtle LED lighting, dramatic yet balanced cool gray, black and metallic tones accented with subtle blue or warm amber highlights, luxurious, energetic and professional feel, ultra-realistic, 8K, studio-quality soft cinematic lighting, a clean well-lit central area around the product, no people, no text, no logos, the product stays sharp, centered and the clear focal point, moody atmosphere, black matte walls, soft volumetric light, premium fitness club ambiance, cinematic bokeh, luxury commercial product photography style" },
  { label: "Bright fitness studio", value: "Place the product in a high-end modern gym interior with sleek workout equipment, dumbbells, barbells, benches, mirrors, rubber flooring and industrial concrete textures softly blurred behind it with realistic shallow depth of field and bokeh, subtle LED lighting, dramatic yet balanced cool gray, black and metallic tones accented with subtle blue or warm amber highlights, luxurious, energetic and professional feel, ultra-realistic, 8K, studio-quality soft cinematic lighting, a clean well-lit central area around the product, no people, no text, no logos, the product stays sharp, centered and the clear focal point, bright modern fitness studio with natural daylight, white and gray interiors, minimal aesthetic, soft background blur, clean commercial advertising style" },
];

const PRESET_ANGLES = [
  { label: "Front", value: "Show the product from a clean straight-on front angle, centered, e-commerce style" },
  { label: "3/4 view", value: "Show the product from a flattering 3/4 angle, slightly elevated, soft shadow" },
  { label: "Top-down", value: "Show the product from a top-down flat lay angle, perfectly centered" },
  { label: "Close-up detail", value: "Show a tight close-up of the product highlighting its texture and fine detail, shallow depth of field, sharp focus on the material" },
  { label: "Low angle hero", value: "Show the product from a slightly low hero angle looking up, making it feel bold and premium, soft shadow and even lighting" },
  { label: "Side profile", value: "Show the product from a clean side profile angle, centered, revealing its full silhouette, e-commerce style" },
];

// Combine what the user has already typed with a clicked preset so presets add to
// (rather than wipe) any custom text. Avoids duplicating a preset that's already there.
const appendPrompt = (current: string, preset: string) => {
  const base = current.trim();
  if (!base) return preset;
  if (base.includes(preset)) return base;
  return `${base.replace(/[.\s]+$/, "")}. ${preset}`;
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const dataUrlToBlob = (dataUrl: string) => {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);/)?.[1] ?? "image/png";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
};

// ── Full description field (keywords → AI generate, Bold/Bullet toolbar) ──────
// Its own component so each row gets an independent textarea ref for the toolbar.
function RowDescriptionField({ row, onChange, onGenerate }: {
  row: Row;
  onChange: (patch: Partial<Row>) => void;
  onGenerate: () => void;
}) {
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="sm:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <Label>Full description</Label>
        <Button type="button" size="sm" variant="ghost" className="h-7 rounded-full"
          onClick={onGenerate} disabled={row.describing}>
          <Sparkles className="h-3 w-3 mr-1" /> {row.describing ? "Writing…" : "Generate with AI"}
        </Button>
      </div>
      <Input value={row.descKeywords} onChange={(e) => onChange({ descKeywords: e.target.value })}
        placeholder="e.g. leak-proof, gift-ready, pastel, BPA-free" className="mt-1.5" />
      <p className="text-xs text-muted-foreground mt-1">
        Add product keywords, features, or highlights to help AI generate the perfect description.
      </p>
      <div className="mt-2 mb-1.5">
        <DescriptionToolbar
          textareaRef={descriptionRef}
          value={row.description}
          onChange={(v) => onChange({ description: v })}
        />
      </div>
      <Textarea ref={descriptionRef} value={row.description}
        onChange={(e) => onChange({ description: e.target.value })}
        rows={4} maxLength={2000}
        placeholder="Detailed product description, materials, care instructions, etc." />
      <div className="flex items-start justify-between gap-2 mt-1">
        <p className="text-[11px] text-muted-foreground">
          Select text and click Bold/Bullet above, or start a line with "- " for a bullet point and wrap text in **double asterisks** for bold headings.
        </p>
        <p className="text-xs text-muted-foreground text-right shrink-0">{row.description.length}/2000</p>
      </div>
    </div>
  );
}

export default function BulkUploadPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push(`/auth?redirect=${encodeURIComponent("/admin/bulk")}`);
  }, [user, loading, router]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: Row[] = [];
    const defaultCategory = categories[0]?.slug || "stationery";
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      const dataUrl = await fileToDataUrl(f);
      const baseName = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      next.push({ id: crypto.randomUUID(), file: f, originalDataUrl: dataUrl, currentDataUrl: dataUrl, editing: false, describing: false, analyzing: false, name: baseName, description: "", descKeywords: "", price: "", category: defaultCategory, stock: "10", colorsText: "", charactersText: "", bgPrompt: PRESET_BACKGROUNDS[0].value, anglePrompt: "", provider: "openai" });
    }
    setRows((r) => [...r, ...next]);
  };

  const update = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const remove = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));

  const runEdit = async (row: Row, prompt: string) => {
    if (!prompt.trim()) return toast.error("Add an edit prompt first");
    update(row.id, { editing: true });
    try {
      const data = await apiFetch("/api/ai/image-edit", {
        method: "POST",
        body: JSON.stringify({ image_base64: row.currentDataUrl, prompt, provider: row.provider }),
      });
      if (!data?.image_base64) throw new Error("No image returned");
      update(row.id, { currentDataUrl: data.image_base64, editing: false });
      toast.success("Image edited ✨");
    } catch (e: any) {
      update(row.id, { editing: false });
      toast.error(e.message || "Edit failed");
    }
  };

  const resetImage = (row: Row) => update(row.id, { currentDataUrl: row.originalDataUrl });

  const describe = async (row: Row) => {
    if (!row.name.trim()) return toast.error("Add a name first");
    update(row.id, { describing: true });
    try {
      const data = await apiFetch("/api/ai/describe", {
        method: "POST",
        body: JSON.stringify({
          name: row.name,
          category: row.category,
          colors: row.colorsText.split(",").map((s) => s.trim()).filter(Boolean),
          keywords: row.descKeywords,
        }),
      });
      update(row.id, { description: data.description || "", describing: false });
    } catch (e: any) {
      update(row.id, { describing: false });
      toast.error(e.message || "Description failed");
    }
  };

  const autoFill = async (row: Row) => {
    update(row.id, { analyzing: true });
    try {
      const data = await apiFetch("/api/ai/analyze", {
        method: "POST",
        body: JSON.stringify({
          image_base64: row.originalDataUrl,
          categories: categories.map((c) => c.slug),
          backgrounds: PRESET_BACKGROUNDS.map((p) => p.label),
          angles: PRESET_ANGLES.map((p) => p.label),
        }),
      });
      const bg = PRESET_BACKGROUNDS.find((p) => p.label === data.background)?.value;
      const angle = PRESET_ANGLES.find((p) => p.label === data.angle)?.value;
      update(row.id, {
        name: data.name || row.name,
        category: categories.some((c) => c.slug === data.category) ? data.category : row.category,
        colorsText: Array.isArray(data.colors) ? data.colors.join(", ") : row.colorsText,
        description: data.description || row.description,
        price: data.price ? String(Math.round(Number(data.price))) : row.price,
        bgPrompt: bg || row.bgPrompt,
        anglePrompt: angle || row.anglePrompt,
        analyzing: false,
      });
      toast.success("Auto-filled from image ✨");
    } catch (e: any) {
      update(row.id, { analyzing: false });
      toast.error(e.message || "Auto-fill failed");
    }
  };

  const autoFillAll = async () => {
    for (const r of rows) await autoFill(r);
  };

  const saveAll = async () => {
    if (!user) return;
    if (rows.length === 0) return toast.error("Add images first");
    for (const r of rows) {
      if (!r.name.trim() || !r.price) return toast.error(`Missing name or price for one item`);
    }
    setSaving(true);
    let ok = 0;
    for (const r of rows) {
      try {
        const blob = dataUrlToBlob(r.currentDataUrl);
        const ext = blob.type.split("/")[1] || "png";
        const { url } = await uploadFile(blob, `bulk-${r.id}.${ext}`);
        const stock = Number(r.stock) || 0;
        const colors = r.colorsText.split(",").map((s) => s.trim()).filter(Boolean)
          .map((label) => ({ label, stock }));
        const characters = r.charactersText.split(",").map((s) => s.trim()).filter(Boolean)
          .map((label) => ({ label, stock }));
        await apiFetch("/api/products", {
          method: "POST",
          body: JSON.stringify({ name: r.name.trim(), description: r.description.trim() || null, price: Number(r.price), category: r.category.trim() || "stationery", stock: Number(r.stock) || 0, image_url: url, colors, characters }),
        });
        ok++;
      } catch (e: any) {
        toast.error(`Failed: ${r.name} — ${e.message}`);
      }
    }
    setSaving(false);
    toast.success(`Saved ${ok} of ${rows.length} products 🌸`);
    if (ok === rows.length) setRows([]);
  };

  if (loading) return <AdminPageSkeleton />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen"><Navbar />
        <main className="container py-12">
          <Card className="p-8 rounded-3xl text-center max-w-lg mx-auto">
            <h1 className="text-2xl font-bold mb-2">Admin access required 🔐</h1>
            <p className="text-muted-foreground">You need admin role to bulk upload.</p>
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
            <span className="ml-2 text-sm text-muted-foreground">Admin / Bulk Upload</span>
          </div>
          <main className="container py-8 space-y-6">
            <div className="flex items-end justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-4xl font-bold">Bulk Upload</h1>
                <p className="text-muted-foreground mt-1">Drop multiple images, edit backgrounds with AI, set details, save all in one go ✨</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-full" onClick={() => router.push("/admin")}>Back to Admin</Button>
                <Button
                  variant="outline"
                  className="rounded-full"
                  disabled={rows.length === 0 || rows.some((r) => r.analyzing)}
                  onClick={autoFillAll}
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  {rows.some((r) => r.analyzing) ? "Auto-filling…" : "Auto-fill All with AI"}
                </Button>
                <Button disabled={saving || rows.length === 0} onClick={saveAll} className="bg-gradient-primary text-primary-foreground border-0 rounded-full">
                  {saving ? "Saving…" : `Create All (${rows.length})`}
                </Button>
              </div>
            </div>

            <Card className="p-6 rounded-3xl">
              <label className="cursor-pointer block">
                <div className="border-2 border-dashed border-border rounded-2xl p-10 text-center hover:bg-muted transition-bounce">
                  <Upload className="h-7 w-7 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-medium">Click or drop multiple images here</p>
                  <p className="text-sm text-muted-foreground">PNG, JPG, WEBP — up to 20MB each</p>
                </div>
                <input type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = ""; }} />
              </label>
            </Card>

            <div className="space-y-4">
              {rows.map((r) => (
                <Card key={r.id} className="p-5 rounded-3xl">
                  <div className="grid md:grid-cols-[220px,1fr] gap-5">
                    <div className="space-y-2">
                      <div className="aspect-square rounded-2xl overflow-hidden bg-gradient-hero relative">
                        <img src={r.currentDataUrl} alt={r.name} className="h-full w-full object-cover" />
                        {(r.editing || r.analyzing) && (
                          <div className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm">
                            <div className="text-sm font-medium flex items-center gap-2"><Sparkles className="h-4 w-4 animate-pulse" /> {r.analyzing ? "Analyzing…" : "Editing…"}</div>
                          </div>
                        )}
                      </div>
                      <Button size="sm" className="rounded-full w-full bg-gradient-primary text-primary-foreground border-0" onClick={() => autoFill(r)} disabled={r.analyzing}>
                        <Sparkles className="h-3 w-3 mr-1" />{r.analyzing ? "Auto-filling…" : "Auto-fill with AI"}
                      </Button>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="rounded-full flex-1" onClick={() => resetImage(r)} disabled={r.editing}>
                          <RotateCcw className="h-3 w-3 mr-1" /> Reset
                        </Button>
                        <Button size="sm" variant="ghost" className="rounded-full text-destructive" onClick={() => remove(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2"><Label>Name</Label>
                          <Input value={r.name} onChange={(e) => update(r.id, { name: e.target.value })} /></div>
                        <div><Label>Price (₹)</Label>
                          <Input type="number" value={r.price} onChange={(e) => update(r.id, { price: e.target.value })} /></div>
                        <div><Label>Stock</Label>
                          <Input type="number" value={r.stock} onChange={(e) => update(r.id, { stock: e.target.value })} /></div>
                        <div><Label>Category</Label>
                          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={r.category} onChange={(e) => update(r.id, { category: e.target.value })}>
                            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                          </select></div>
                        <div><Label>Colors (comma-separated)</Label>
                          <Input placeholder="pink, lilac, mint" value={r.colorsText} onChange={(e) => update(r.id, { colorsText: e.target.value })} /></div>
                        <div><Label>Character / design (comma-separated)</Label>
                          <Input placeholder="Doraemon, Hello Kitty" value={r.charactersText} onChange={(e) => update(r.id, { charactersText: e.target.value })} /></div>
                        <RowDescriptionField
                          row={r}
                          onChange={(patch) => update(r.id, patch)}
                          onGenerate={() => describe(r)}
                        />
                      </div>
                      <div className="rounded-2xl bg-muted/40 p-3 space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 text-sm font-medium"><Wand2 className="h-4 w-4" /> AI image editing</div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">Engine</span>
                            <div className="flex gap-0.5 p-0.5 bg-muted rounded-lg">
                              {(["openai", "gemini"] as const).map((pv) => (
                                <button key={pv} type="button" onClick={() => update(r.id, { provider: pv })}
                                  className={cn(
                                    "px-2.5 py-1 text-xs rounded-md font-medium transition-colors",
                                    r.provider === pv ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                  )}>
                                  {pv === "openai" ? "OpenAI" : "Gemini"}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Background</Label>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {PRESET_BACKGROUNDS.map((p) => (
                              <Badge key={p.label} variant="outline" className="cursor-pointer hover:bg-primary/10" onClick={() => update(r.id, { bgPrompt: appendPrompt(r.bgPrompt, p.value) })}>{p.label}</Badge>
                            ))}
                          </div>
                          <p className="text-[11px] text-muted-foreground mb-1.5">Pick a preset to fill in a detailed prompt, then edit it or add your own details before applying.</p>
                          <div className="flex gap-2 items-end">
                            <Textarea value={r.bgPrompt} onChange={(e) => update(r.id, { bgPrompt: e.target.value })} placeholder="Describe the new background, or pick a preset above and tweak it…" rows={4} className="resize-y min-h-[88px] text-sm" />
                            <Button size="sm" className="rounded-full" disabled={r.editing} onClick={() => runEdit(r, r.bgPrompt)}>Apply</Button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Angle / framing</Label>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {PRESET_ANGLES.map((p) => (
                              <Badge key={p.label} variant="outline" className="cursor-pointer hover:bg-primary/10" onClick={() => update(r.id, { anglePrompt: appendPrompt(r.anglePrompt, p.value) })}>{p.label}</Badge>
                            ))}
                          </div>
                          <p className="text-[11px] text-muted-foreground mb-1.5">Pick a preset or type your own framing instructions — you can combine both.</p>
                          <div className="flex gap-2 items-end">
                            <Textarea value={r.anglePrompt} onChange={(e) => update(r.id, { anglePrompt: e.target.value })} placeholder="e.g. show from a flattering 3/4 angle, slightly elevated…" rows={3} className="resize-y min-h-[66px] text-sm" />
                            <Button size="sm" variant="secondary" className="rounded-full" disabled={r.editing} onClick={() => runEdit(r, r.anglePrompt)}>Apply</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
