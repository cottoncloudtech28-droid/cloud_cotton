"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getPromptPresets, createPromptPreset, updatePromptPreset, togglePromptPreset,
  deletePromptPreset, reorderPromptPresets, restoreDefaultPromptPresets,
  type PromptPresetInput,
} from "@/lib/api";
import { clearPromptPresetCache, GROUP_LABELS, PRODUCT_TOKEN, fillPrompt } from "@/hooks/usePromptPresets";
import type { PromptPreset, PromptGroup } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Info, ChevronUp, ChevronDown, RotateCcw, Image as ImageIcon,
  Camera, Sparkles, Search,
} from "lucide-react";

const GROUPS: PromptGroup[] = ["background", "angle", "style"];

const GROUP_META: Record<PromptGroup, { icon: typeof ImageIcon; hint: string }> = {
  background: {
    icon: ImageIcon,
    hint: "Describes the scene placed behind the product. Clicking one appends it to whatever is already typed.",
  },
  angle: {
    icon: Camera,
    hint: "Describes the camera framing. Also appends, so it can be combined with a background.",
  },
  style: {
    icon: Sparkles,
    hint: `Replaces the whole prompt with a complete look. Use ${PRODUCT_TOKEN} where the product's name should appear.`,
  },
};

const emptyForm: PromptPresetInput = {
  group: "background",
  label: "",
  value: "",
  is_active: true,
};

export default function PromptsPage() {
  const [presets, setPresets] = useState<PromptPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PromptPresetInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Any change here must invalidate the copy the editors are holding.
  const apply = (rows: PromptPreset[]) => {
    setPresets(rows);
    clearPromptPresetCache();
  };

  const load = () => {
    getPromptPresets()
      .then(apply)
      .catch((e) => toast.error(e.message || "Failed to load prompts"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const setField = <K extends keyof PromptPresetInput>(key: K, val: PromptPresetInput[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const openCreate = (group: PromptGroup) => {
    setEditingId(null);
    setForm({ ...emptyForm, group });
    setDialogOpen(true);
  };

  const openEdit = (p: PromptPreset) => {
    setEditingId(p.id);
    setForm({ group: p.group, label: p.label, value: p.value, is_active: p.is_active });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.label.trim()) return toast.error("Give the prompt a short name");
    if (!form.value.trim()) return toast.error("Add the prompt text");
    setSaving(true);
    try {
      const payload: PromptPresetInput = {
        group: form.group,
        label: form.label.trim(),
        value: form.value.trim(),
        is_active: form.is_active,
      };
      if (editingId) {
        const updated = await updatePromptPreset(editingId, payload);
        apply(presets.map((p) => (p.id === editingId ? updated : p)));
        toast.success("Prompt updated");
      } else {
        const created = await createPromptPreset(payload);
        apply([...presets, created]);
        toast.success("Prompt added");
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (p: PromptPreset) => {
    try {
      const updated = await togglePromptPreset(p.id, !p.is_active);
      apply(presets.map((r) => (r.id === p.id ? updated : r)));
    } catch (e: any) {
      toast.error(e.message || "Failed to update");
    }
  };

  const remove = async (p: PromptPreset) => {
    if (!confirm(`Delete the "${p.label}" prompt? This cannot be undone.`)) return;
    try {
      await deletePromptPreset(p.id);
      apply(presets.filter((r) => r.id !== p.id));
      toast.success("Prompt deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  // Swap a preset with its neighbour inside the same group.
  const move = async (p: PromptPreset, dir: -1 | 1) => {
    const siblings = presets
      .filter((r) => r.group === p.group)
      .sort((a, b) => a.sort_order - b.sort_order);
    const i = siblings.findIndex((r) => r.id === p.id);
    const j = i + dir;
    if (j < 0 || j >= siblings.length) return;

    const reordered = [...siblings];
    [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
    const order = reordered.map((r, idx) => ({ id: r.id, sort_order: idx }));

    // Optimistic — the list is small and the swap should feel instant.
    const bySort = new Map(order.map((o) => [o.id, o.sort_order]));
    apply(presets.map((r) => (bySort.has(r.id) ? { ...r, sort_order: bySort.get(r.id)! } : r)));
    try {
      apply(await reorderPromptPresets(order));
    } catch (e: any) {
      toast.error(e.message || "Failed to reorder");
      load();
    }
  };

  const restore = async () => {
    if (!confirm("Re-add any built-in prompts you've deleted? Your own prompts and edits are kept.")) return;
    setRestoring(true);
    try {
      const { restored, presets: rows } = await restoreDefaultPromptPresets();
      apply(rows);
      toast.success(restored ? `Restored ${restored} built-in prompt${restored !== 1 ? "s" : ""}` : "Nothing to restore — all built-ins are present");
    } catch (e: any) {
      toast.error(e.message || "Failed to restore");
    } finally {
      setRestoring(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return presets;
    return presets.filter(
      (p) => p.label.toLowerCase().includes(q) || p.value.toLowerCase().includes(q)
    );
  }, [presets, query]);

  const grouped = (g: PromptGroup) =>
    filtered.filter((p) => p.group === g).sort((a, b) => a.sort_order - b.sort_order);

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-32 rounded-3xl" />
      </div>
    );
  }

  return (
    <>
      <main className="flex-1 p-6 space-y-5 max-w-4xl">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">AI Prompts</h1>
          <Button
            onClick={restore}
            disabled={restoring}
            size="sm"
            variant="outline"
            className="rounded-full h-8 gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" /> {restoring ? "Restoring…" : "Restore built-ins"}
          </Button>
        </div>

        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-sm text-blue-800">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            These are the one-click prompt chips in the AI image editor — on the product page and
            in Bulk Upload. Add your own, reword the built-ins, reorder them, or switch one off to
            hide it without losing the text. Changes apply everywhere immediately.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search prompts by name or text…"
            className="pl-9 rounded-full"
          />
        </div>

        {GROUPS.map((g) => {
          const rows = grouped(g);
          const Icon = GROUP_META[g].icon;
          const total = presets.filter((p) => p.group === g).length;
          return (
            <section key={g} className="space-y-2.5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    {GROUP_LABELS[g]}
                    <span className="text-sm font-normal text-muted-foreground">({total})</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{GROUP_META[g].hint}</p>
                </div>
                <Button
                  onClick={() => openCreate(g)}
                  size="sm"
                  className="rounded-full h-8 bg-gradient-primary text-primary-foreground border-0 gap-1.5 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>

              {rows.length === 0 ? (
                <Card className="p-6 rounded-3xl text-center text-sm text-muted-foreground">
                  {query ? "No prompts match your search." : "No prompts in this group yet."}
                </Card>
              ) : (
                <div className="space-y-2">
                  {rows.map((p, i) => (
                    <Card key={p.id} className="p-4 rounded-2xl">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{p.label}</span>
                            {!p.is_active && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                            {p.value}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <div className="flex flex-col">
                            <button
                              type="button"
                              title="Move up"
                              onClick={() => move(p, -1)}
                              disabled={i === 0 || !!query}
                              className="h-4 w-6 grid place-items-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Move down"
                              onClick={() => move(p, 1)}
                              disabled={i === rows.length - 1 || !!query}
                              className="h-4 w-6 grid place-items-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <Switch
                            checked={p.is_active}
                            onCheckedChange={() => toggle(p)}
                            className="mx-1.5"
                          />
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)} className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(p)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </main>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit prompt" : "New prompt"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update this preset. It changes everywhere the chip appears."
                : "Add a preset chip to the AI image editor."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Group</Label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {GROUPS.map((g) => {
                  const Icon = GROUP_META[g].icon;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setField("group", g)}
                      className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 text-xs font-medium transition-colors ${
                        form.group === g
                          ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                          : "border-border hover:bg-muted/60"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {GROUP_LABELS[g]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>Chip name</Label>
              <Input
                value={form.label}
                onChange={(e) => setField("label", e.target.value)}
                placeholder="e.g. Cozy Christmas"
                maxLength={80}
                className="mt-1.5"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                The short label shown on the clickable chip.
              </p>
            </div>

            <div>
              <Label>Prompt text</Label>
              <Textarea
                value={form.value}
                onChange={(e) => setField("value", e.target.value)}
                placeholder="Describe exactly what the AI should do…"
                rows={7}
                maxLength={4000}
                className="mt-1.5 resize-y min-h-[140px] text-sm"
              />
              <div className="flex items-start justify-between gap-3 mt-1">
                <p className="text-[11px] text-muted-foreground">
                  {form.group === "style" ? (
                    <>
                      Write <code className="bg-muted px-1 rounded">{PRODUCT_TOKEN}</code> where the
                      product name belongs — e.g. &ldquo;Studio photo of {PRODUCT_TOKEN} on
                      marble&rdquo;.
                    </>
                  ) : (
                    "This gets appended to whatever the editor already has typed."
                  )}
                </p>
                <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                  {form.value.length}/4000
                </span>
              </div>
            </div>

            {form.group === "style" && form.value.includes(PRODUCT_TOKEN) && (
              <div className="rounded-xl bg-muted/60 border border-border p-3">
                <p className="text-[11px] font-medium text-muted-foreground mb-1">
                  Preview with a sample product
                </p>
                <p className="text-xs leading-relaxed">
                  {fillPrompt(form.value, "Pastel Bunny Water Bottle")}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <div>
                <Label className="cursor-pointer">Visible in the editor</Label>
                <p className="text-[11px] text-muted-foreground">Turn off to hide the chip without deleting it.</p>
              </div>
              <Switch
                checked={form.is_active ?? true}
                onCheckedChange={(c) => setField("is_active", c)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-full">
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className="rounded-full bg-gradient-primary text-primary-foreground border-0"
            >
              {saving ? "Saving…" : editingId ? "Save changes" : "Add prompt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
