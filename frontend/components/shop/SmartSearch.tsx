"use client";

import { useEffect, useRef, useState, useCallback, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, X, TrendingUp, ImageOff } from "lucide-react";
import { searchSuggestions } from "@/lib/api";

type Suggestion = {
  id: string;
  slug: string | null;
  name: string;
  price: number;
  discount_percent: number;
  image_url: string | null;
  category: string;
  stock: number;
};

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    new RegExp(`^${escaped}$`, "i").test(part)
      ? <mark key={i} className="bg-primary/20 text-primary font-semibold not-italic rounded px-0.5">{part}</mark>
      : part
  );
}

interface SmartSearchProps {
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  onClose?: () => void;
}

export default function SmartSearch({
  className = "",
  inputClassName = "",
  placeholder = "Search cuties…",
  onClose,
}: SmartSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced fetch
  const fetchSuggestions = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setSuggestions([]); setLoading(false); setOpen(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchSuggestions(q, 6);
        setSuggestions(results);
        setOpen(results.length > 0 || q.trim().length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 280);
  }, []);

  useEffect(() => {
    fetchSuggestions(query);
    setCursor(-1);
  }, [query, fetchSuggestions]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const goToProduct = (slugOrId: string) => {
    setOpen(false);
    setQuery("");
    onClose?.();
    router.push(`/product/${slugOrId}`);
  };

  const goToSearch = (q: string) => {
    if (!q.trim()) return;
    setOpen(false);
    setQuery("");
    onClose?.();
    router.push(`/shop?q=${encodeURIComponent(q.trim())}`);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const total = suggestions.length + 1; // +1 for "see all" row
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (c + 1) % total);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (c - 1 + total) % total);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (cursor >= 0 && cursor < suggestions.length) {
        goToProduct(suggestions[cursor].slug ?? suggestions[cursor].id);
      } else {
        goToSearch(query);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const finalPrice = (s: Suggestion) =>
    +(s.price * (1 - s.discount_percent / 100)).toFixed(0);

  return (
    <div className={`relative ${className}`}>
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (query.trim()) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full h-9 pl-9 pr-8 rounded-full bg-muted border-transparent border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/30 transition-all ${inputClassName}`}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setSuggestions([]); setOpen(false); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && query.trim() && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-background border-2 border-border rounded-2xl z-50 overflow-hidden"
        >
          {loading && suggestions.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <div className="h-3 w-3 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
              Searching…
            </div>
          )}

          {!loading && suggestions.length === 0 && query.trim().length > 0 && (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              No results for &quot;<span className="font-medium text-foreground">{query}</span>&quot;
            </div>
          )}

          {suggestions.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goToProduct(s.slug ?? s.id)}
              onMouseEnter={() => setCursor(i)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-border/40 last:border-0 ${
                cursor === i ? "bg-accent" : "hover:bg-accent/50"
              }`}
            >
              {/* Thumbnail */}
              <div className="h-10 w-10 rounded-lg bg-muted flex-shrink-0 overflow-hidden border border-border/40">
                {s.image_url
                  ? <img src={s.image_url} alt={s.name} className="h-full w-full object-cover" />
                  : <div className="h-full w-full flex items-center justify-center bg-muted"><ImageOff className="h-4 w-4 text-muted-foreground/25" /></div>}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{highlight(s.name, query)}</p>
                <p className="text-xs text-muted-foreground capitalize">{s.category.replace(/-/g, " ")}</p>
              </div>

              {/* Price */}
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold">₹{finalPrice(s)}</p>
                {s.discount_percent > 0 && (
                  <p className="text-[10px] text-green-600 font-medium">{s.discount_percent}% off</p>
                )}
              </div>
            </button>
          ))}

          {/* See all results row */}
          {query.trim() && (
            <button
              onClick={() => goToSearch(query)}
              onMouseEnter={() => setCursor(suggestions.length)}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-primary transition-colors ${
                cursor === suggestions.length ? "bg-primary/10" : "hover:bg-primary/5"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              See all results for &quot;{query}&quot;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
