"use client";

import { useEffect, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal } from "lucide-react";

export interface ProductFacets {
  priceMin: number;
  priceMax: number;
  colors: string[];
  sizes: string[];
}

export interface FilterValues {
  minPrice: number | null;
  maxPrice: number | null;
  colors: string[];
  sizes: string[];
  inStock: boolean;
}

export const EMPTY_FILTERS: FilterValues = {
  minPrice: null,
  maxPrice: null,
  colors: [],
  sizes: [],
  inStock: false,
};

export function countActiveFilters(v: FilterValues): number {
  return (
    (v.minPrice != null || v.maxPrice != null ? 1 : 0) +
    v.colors.length +
    v.sizes.length +
    (v.inStock ? 1 : 0)
  );
}

interface ProductFiltersProps {
  facets: ProductFacets;
  value: FilterValues;
  onApply: (value: FilterValues) => void;
}

export default function ProductFilters({ facets, value, onApply }: ProductFiltersProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterValues>(value);

  const lo = Math.floor(facets.priceMin ?? 0);
  const hi = Math.max(Math.ceil(facets.priceMax ?? 0), lo + 1);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const range: [number, number] = [draft.minPrice ?? lo, draft.maxPrice ?? hi];

  const toggle = (list: string[], item: string) =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  const activeCount = countActiveFilters(value);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="rounded-full gap-2 flex-shrink-0">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <Badge className="ml-0.5 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Price range */}
          <div className="space-y-3">
            <p className="text-sm font-semibold">Price range</p>
            <Slider
              min={lo}
              max={hi}
              step={1}
              value={range}
              onValueChange={([min, max]) => setDraft((d) => ({ ...d, minPrice: min, maxPrice: max }))}
            />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>₹{range[0]}</span>
              <span>₹{range[1]}</span>
            </div>
          </div>

          {/* In stock */}
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={draft.inStock}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, inStock: v === true }))}
            />
            <span className="text-sm">In stock only</span>
          </label>

          {/* Colors */}
          {facets.colors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Color</p>
              <div className="flex flex-wrap gap-2">
                {facets.colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, colors: toggle(d.colors, c) }))}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      draft.colors.includes(c)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:border-primary hover:bg-muted"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {facets.sizes.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Size</p>
              <div className="flex flex-wrap gap-2">
                {facets.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, sizes: toggle(d.sizes, s) }))}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      draft.sizes.includes(s)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:border-primary hover:bg-muted"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="mt-8 flex-row gap-2 sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => { setDraft(EMPTY_FILTERS); onApply(EMPTY_FILTERS); setOpen(false); }}
          >
            Clear all
          </Button>
          <SheetClose asChild>
            <Button
              onClick={() => onApply(draft)}
              className="bg-gradient-primary text-primary-foreground border-0"
            >
              Apply filters
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
