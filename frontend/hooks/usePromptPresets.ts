"use client";

import { useEffect, useState } from "react";
import { getPromptPresets } from "@/lib/api";
import type { PromptPreset, PromptGroup } from "@/lib/types";

/** Placeholder in "style" prompts, swapped for the product's name before use. */
export const PRODUCT_TOKEN = "{product}";

export const fillPrompt = (value: string, productName: string) =>
  value.replace(/\{product\}/g, productName);

export const GROUP_LABELS: Record<PromptGroup, string> = {
  background: "Background",
  angle: "Angle / framing",
  style: "Full style",
};

// The presets are shared by the product editor and the bulk upload page and
// rarely change mid-session, so the first fetch is reused for the life of the
// tab. The management page calls clearPromptPresetCache() after every edit so
// the editors pick changes up without a reload.
let cache: PromptPreset[] | null = null;
let inflight: Promise<PromptPreset[]> | null = null;

export function clearPromptPresetCache() {
  cache = null;
  inflight = null;
}

export function usePromptPresets() {
  const [presets, setPresets] = useState<PromptPreset[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) {
      setPresets(cache);
      setLoading(false);
      return;
    }
    let alive = true;
    if (!inflight) {
      inflight = getPromptPresets();
      // Drop a failed request so a later mount can retry instead of replaying it.
      inflight.catch(() => { inflight = null; });
    }
    inflight
      .then((rows) => {
        cache = rows;
        if (alive) setPresets(rows);
      })
      // Presets are a convenience — on failure the editor still takes a typed prompt.
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const inGroup = (g: PromptGroup) => presets.filter((p) => p.group === g && p.is_active);

  return {
    presets,
    loading,
    backgrounds: inGroup("background"),
    angles: inGroup("angle"),
    styles: inGroup("style"),
  };
}
