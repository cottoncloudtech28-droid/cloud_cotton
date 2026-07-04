"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line, CartesianGrid,
} from "recharts";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/shop/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Package, AlertTriangle, TrendingDown, DollarSign,
  RefreshCw, Save, ChevronRight, ChevronLeft, Download,
  Upload, X, TrendingUp, Zap, FileText,
} from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";
import {
  apiFetch, getLowStockProducts, getStockLogs, bulkUpdateStock,
  getRestockRecommendations,
} from "@/lib/api";
import type { Product, StockLog, RestockRecommendation } from "@/lib/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

const stockColor = (stock: number, reorder: number) => {
  if (stock === 0) return "#ef4444";
  if (stock <= reorder) return "#f59e0b";
  return "#22c55e";
};

function downloadCSV(rows: object[], filename: string) {
  if (rows.length === 0) { toast("No data to export"); return; }
  const headers = Object.keys(rows[0]);
  const lines = rows.map((r: any) =>
    headers.map((h) => {
      const v = r[h] ?? "";
      return typeof v === "string" && (v.includes(",") || v.includes('"'))
        ? `"${v.replace(/"/g, '""')}"`
        : v;
    }).join(",")
  );
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): { sku: string; stock: string; note: string }[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1)
    .map((line) => {
      const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: any = {};
      headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
      return row;
    })
    .filter((r) => r.sku);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent: string;
}) {
  return (
    <Card className="p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-xl ${accent}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

function LogRow({ log }: { log: StockLog }) {
  const name = log.product && typeof log.product === "object" ? log.product.name : log.productName;
  const isDeduct = log.change < 0;
  const reasonColors: Record<string, string> = {
    order: "bg-blue-50 text-blue-700 border-blue-200",
    cancellation: "bg-green-50 text-green-700 border-green-200",
    restock: "bg-emerald-50 text-emerald-700 border-emerald-200",
    manual_adjust: "bg-gray-50 text-gray-700 border-gray-200",
    bulk_update: "bg-purple-50 text-purple-700 border-purple-200",
    correction: "bg-orange-50 text-orange-700 border-orange-200",
    return: "bg-teal-50 text-teal-700 border-teal-200",
  };
  const reasonStyle = reasonColors[log.reason] ?? "bg-gray-50 text-gray-700 border-gray-200";

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0 text-sm">
      <span className={`font-mono font-bold w-12 text-right shrink-0 ${isDeduct ? "text-red-500" : "text-green-600"}`}>
        {isDeduct ? "" : "+"}{log.change}
      </span>
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium">{name}{log.size && ` – ${log.size}`}</p>
        <p className="text-xs text-muted-foreground">
          {log.stockBefore} → {log.stockAfter}
          {log.orderId && ` · ${log.orderId}`}
          {log.note && ` · ${log.note}`}
        </p>
      </div>
      <Badge variant="outline" className={`text-[10px] shrink-0 capitalize border ${reasonStyle}`}>
        {log.reason.replace(/_/g, " ")}
      </Badge>
      <span className="text-xs text-muted-foreground shrink-0 hidden md:block">
        {new Date(log.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
      </span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
type Tab = "overview" | "bulk" | "logs" | "export";

export default function InventoryPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [recommendations, setRecommendations] = useState<RestockRecommendation[]>([]);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [logReason, setLogReason] = useState("");
  const [fetching, setFetching] = useState(true);

  // Bulk edit
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // CSV upload
  const [csvRows, setCsvRows] = useState<{ sku: string; stock: string; note: string }[]>([]);
  const [csvError, setCsvError] = useState("");
  const [csvUploading, setCsvUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.push(`/auth?redirect=${encodeURIComponent("/admin/inventory")}`);
  }, [user, loading, router]);

  const loadAll = useCallback(async () => {
    if (!isAdmin) return;
    setFetching(true);
    try {
      const [prods, low, logRes, recs] = await Promise.all([
        apiFetch("/api/products/all") as Promise<Product[]>,
        getLowStockProducts(),
        getStockLogs({ limit: 30, page: logPage, reason: logReason || undefined }),
        getRestockRecommendations(),
      ]);
      setAllProducts(prods);
      setLowStock(low);
      setLogs(logRes.logs);
      setLogTotal(logRes.total);
      setRecommendations(recs);
      const seed: Record<string, string> = {};
      prods.forEach((p) => { seed[p.id] = String(p.stock); });
      setEdits(seed);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setFetching(false);
    }
  }, [isAdmin, logPage, logReason]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalProducts  = allProducts.length;
  const outOfStock     = allProducts.filter((p) => p.stock === 0).length;
  const lowStockCount  = allProducts.filter((p) => p.stock > 0 && p.stock <= (p.reorder_point ?? 5)).length;
  const totalValue     = allProducts.reduce((s, p) => s + p.price * p.stock, 0);
  const criticalCount  = recommendations.filter((r) => r.urgency === "critical").length;

  const categoryData = Object.values(
    allProducts.reduce<Record<string, { category: string; stock: number; products: number }>>((acc, p) => {
      const key = p.category;
      if (!acc[key]) acc[key] = { category: p.category.replace(/-/g, " "), stock: 0, products: 0 };
      acc[key].stock += p.stock;
      acc[key].products += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.stock - a.stock);

  const pieData = [
    { name: "In stock", value: totalProducts - outOfStock - lowStockCount, fill: "#22c55e" },
    { name: "Low stock", value: lowStockCount, fill: "#f59e0b" },
    { name: "Out of stock", value: outOfStock, fill: "#ef4444" },
  ].filter((d) => d.value > 0);

  // ── Bulk save ─────────────────────────────────────────────────────────────
  const handleBulkSave = async () => {
    const updates = allProducts
      .filter((p) => {
        const edited = parseInt(edits[p.id] ?? String(p.stock));
        return !isNaN(edited) && edited !== p.stock;
      })
      .map((p) => ({ id: p.id, stock: parseInt(edits[p.id]) }));

    if (updates.length === 0) { toast("No changes to save"); return; }
    setSaving(true);
    try {
      const res = await bulkUpdateStock(updates);
      toast.success(`Updated ${res.updated} product${res.updated !== 1 ? "s" : ""}`);
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── CSV upload ─────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) {
        setCsvError("Could not parse CSV. Ensure the file has a header row with at least a 'sku' and 'stock' column.");
        setCsvRows([]);
      } else {
        setCsvRows(rows);
      }
    };
    reader.readAsText(file);
  };

  const handleCsvUpload = async () => {
    if (csvRows.length === 0) return;
    setCsvUploading(true);
    try {
      // Resolve SKUs to product IDs
      const skuMap = new Map(allProducts.map((p) => [p.sku?.toUpperCase(), p.id]));
      const updates = csvRows
        .map((r) => ({
          id: skuMap.get(r.sku.toUpperCase()),
          stock: parseInt(r.stock),
          note: r.note || undefined,
        }))
        .filter((u) => u.id && !isNaN(u.stock)) as { id: string; stock: number; note?: string }[];

      if (updates.length === 0) {
        toast.error("No matching products found. Check that SKUs in your CSV match the product catalog.");
        return;
      }

      const res = await bulkUpdateStock(updates);
      toast.success(`CSV import: updated ${res.updated} product${res.updated !== 1 ? "s" : ""}`);
      setCsvRows([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCsvUploading(false);
    }
  };

  // ── CSV exports ───────────────────────────────────────────────────────────
  const exportInventoryCSV = () => {
    const rows = allProducts.map((p) => ({
      SKU: p.sku ?? "",
      Name: p.name,
      Category: p.category,
      Stock: p.stock,
      ReorderPoint: p.reorder_point ?? 5,
      Price: p.price,
      InventoryValue: p.price * p.stock,
      Status: p.stock === 0 ? "Out of stock" : p.stock <= (p.reorder_point ?? 5) ? "Low stock" : "In stock",
    }));
    downloadCSV(rows, `inventory-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportLogsCSV = async () => {
    try {
      toast("Fetching all log entries…");
      const res = await getStockLogs({ limit: 200, page: 1 });
      const rows = res.logs.map((l) => ({
        Date: new Date(l.createdAt).toLocaleString("en-IN"),
        Product: l.productName,
        SKU: l.sku ?? "",
        Size: l.size ?? "",
        Change: l.change,
        StockBefore: l.stockBefore,
        StockAfter: l.stockAfter,
        Reason: l.reason,
        OrderID: l.orderId ?? "",
        Note: l.note ?? "",
      }));
      downloadCSV(rows, `stock-log-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const logPages = Math.ceil(logTotal / 30);
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: BarChart2Icon },
    { id: "bulk", label: "Bulk Update", icon: Save },
    { id: "logs", label: "Audit Log", icon: FileText },
    { id: "export", label: "Export", icon: Download },
  ];

  if (loading) return <AdminPageSkeleton />;
  if (!isAdmin) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <div className="h-10 flex items-center border-b px-2">
            <SidebarTrigger />
            <span className="ml-2 text-sm text-muted-foreground">Admin / Inventory</span>
          </div>
          <main className="container py-8 space-y-8">

            {/* Header */}
            <div className="flex items-end justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-4xl font-bold">Inventory</h1>
                <p className="text-muted-foreground mt-1">Stock levels, alerts, and audit trail</p>
              </div>
              <Button variant="outline" onClick={loadAll} disabled={fetching}>
                <RefreshCw className={`h-4 w-4 mr-2 ${fetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {/* Critical alert banner */}
            {!fetching && criticalCount > 0 && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <Zap className="h-5 w-5 text-red-500 shrink-0" />
                <div className="flex-1 text-sm">
                  <span className="font-semibold text-red-700">{criticalCount} product{criticalCount !== 1 ? "s" : ""} critically low or out of stock.</span>
                  {" "}
                  <span className="text-red-600">Consider raising a purchase order immediately.</span>
                </div>
                <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100"
                  onClick={() => setActiveTab("overview")}>
                  View alerts
                </Button>
              </div>
            )}

            {/* Stat cards */}
            {fetching ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total products" value={totalProducts}
                  sub={`${allProducts.filter((p) => p.is_active).length} active`}
                  icon={Package} accent="bg-primary" />
                <StatCard label="Out of stock" value={outOfStock}
                  sub="needs restock immediately"
                  icon={TrendingDown} accent="bg-red-500" />
                <StatCard label="Low stock" value={lowStockCount}
                  sub="at or below reorder point"
                  icon={AlertTriangle} accent="bg-amber-500" />
                <StatCard
                  label="Inventory value"
                  value={`₹${totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
                  sub="at full price"
                  icon={DollarSign} accent="bg-green-600" />
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* ── OVERVIEW TAB ─────────────────────────────────────────── */}
            {activeTab === "overview" && (
              <div className="space-y-8">
                {/* Charts */}
                {!fetching && allProducts.length > 0 && (
                  <div className="grid md:grid-cols-3 gap-6">
                    <Card className="md:col-span-2 p-5 space-y-3">
                      <h2 className="font-semibold">Stock by category</h2>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={categoryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                          <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: number) => [`${v} units`, "Stock"]} contentStyle={{ fontSize: 12 }} />
                          <Bar dataKey="stock" radius={[4, 4, 0, 0]}>
                            {categoryData.map((_, i) => (
                              <Cell key={i} fill={`hsl(${(i * 47) % 360} 60% 55%)`} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                    <Card className="p-5 space-y-3">
                      <h2 className="font-semibold">Stock status</h2>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name"
                            cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3}>
                            {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          </Pie>
                          <Legend iconType="circle" iconSize={10}
                            formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
                          <Tooltip formatter={(v: number) => [`${v} products`]} contentStyle={{ fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </Card>
                  </div>
                )}

                {/* Low stock alerts */}
                {!fetching && lowStock.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Low stock alerts
                      <Badge className="bg-amber-100 text-amber-700 border-0">{lowStock.length}</Badge>
                    </h2>
                    <div className="grid md:grid-cols-2 gap-3">
                      {lowStock.map((p) => {
                        const rp = p.reorder_point ?? 5;
                        const imgSrc = p.images?.[0] ?? p.image_url;
                        return (
                          <Card key={p.id} className="p-3 flex items-center gap-3">
                            <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden shrink-0 border border-border">
                              {imgSrc && <img src={imgSrc} alt={p.name} className="h-full w-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{p.category} · reorder at {rp}</p>
                              {p.sizes && p.sizes.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {p.sizes.map((sz) => (
                                    <span key={sz.label}
                                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                        sz.stock === 0 ? "bg-red-100 text-red-700"
                                        : sz.stock <= rp ? "bg-amber-100 text-amber-700"
                                        : "bg-muted text-muted-foreground"
                                      }`}>
                                      {sz.label}: {sz.stock}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {p.colors && p.colors.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {p.colors.map((c) => (
                                    <span key={c.label}
                                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                        c.stock === 0 ? "bg-red-100 text-red-700"
                                        : c.stock <= rp ? "bg-amber-100 text-amber-700"
                                        : "bg-muted text-muted-foreground"
                                      }`}>
                                      {c.label}: {c.stock}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`text-xl font-bold ${p.stock === 0 ? "text-red-500" : "text-amber-600"}`}>
                                {p.stock}
                              </p>
                              <p className="text-[10px] text-muted-foreground">units left</p>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Restock recommendations */}
                {!fetching && recommendations.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Restock recommendations
                      <Badge className="bg-primary/10 text-primary border-0">{recommendations.length}</Badge>
                      <span className="text-sm font-normal text-muted-foreground ml-1">based on last 30 days of sales</span>
                    </h2>
                    <div className="border border-border rounded-xl overflow-hidden">
                      <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <span className="col-span-4">Product</span>
                        <span className="col-span-1 text-center">Stock</span>
                        <span className="col-span-2 text-center">Sold (30d)</span>
                        <span className="col-span-2 text-center">Daily rate</span>
                        <span className="col-span-2 text-center">Days left</span>
                        <span className="col-span-1 text-center">Order qty</span>
                      </div>
                      {recommendations.map((r) => (
                        <div key={r.id} className={`grid grid-cols-12 gap-2 px-4 py-3 items-center border-t border-border ${
                          r.urgency === "critical" ? "bg-red-50/50" : "bg-amber-50/30"
                        }`}>
                          <div className="col-span-4 flex items-center gap-2 min-w-0">
                            {r.image_url && (
                              <img src={r.image_url} alt="" className="h-8 w-8 rounded-md object-cover shrink-0 border border-border" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{r.name}</p>
                              <p className="text-[10px] font-mono text-muted-foreground">{r.sku ?? "—"}</p>
                            </div>
                          </div>
                          <div className="col-span-1 text-center">
                            <span className={`text-sm font-bold ${r.currentStock === 0 ? "text-red-600" : "text-amber-600"}`}>
                              {r.currentStock}
                            </span>
                          </div>
                          <div className="col-span-2 text-center text-sm text-muted-foreground">{r.sold30d}</div>
                          <div className="col-span-2 text-center text-sm text-muted-foreground">{r.dailyRate}/day</div>
                          <div className="col-span-2 text-center">
                            {r.daysRemaining !== null ? (
                              <Badge className={`text-[10px] ${
                                r.urgency === "critical"
                                  ? "bg-red-100 text-red-700 border-red-200"
                                  : "bg-amber-100 text-amber-700 border-amber-200"
                              } border`}>
                                {r.daysRemaining}d
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                          <div className="col-span-1 text-center">
                            <span className="text-sm font-semibold text-primary">{r.recommendedQty}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Recommendation = max(3× reorder point, 1.5× units sold in last 30 days).
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── BULK UPDATE TAB ───────────────────────────────────────── */}
            {activeTab === "bulk" && (
              <div className="space-y-8">
                {/* Manual bulk editor */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="text-xl font-semibold">Manual bulk update</h2>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Edit stock numbers and save. Only modified rows are updated.
                      </p>
                    </div>
                    <Button onClick={handleBulkSave} disabled={saving || fetching}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Saving…" : "Save all changes"}
                    </Button>
                  </div>

                  {fetching ? (
                    <div className="space-y-2">
                      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
                    </div>
                  ) : (
                    <div className="border border-border rounded-xl overflow-hidden">
                      <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <span className="col-span-1" />
                        <span className="col-span-4">Product</span>
                        <span className="col-span-2">Category</span>
                        <span className="col-span-2">SKU</span>
                        <span className="col-span-1 text-center">Reorder</span>
                        <span className="col-span-2 text-center">Stock</span>
                      </div>
                      <div className="divide-y divide-border">
                        {allProducts.map((p) => {
                          const currentEdit = edits[p.id] ?? String(p.stock);
                          const editNum = parseInt(currentEdit);
                          const isDirty = !isNaN(editNum) && editNum !== p.stock;
                          const rp = p.reorder_point ?? 5;
                          const imgSrc = p.images?.[0] ?? p.image_url;

                          return (
                            <div key={p.id} className={`grid grid-cols-12 gap-2 px-4 py-2.5 items-center ${isDirty ? "bg-primary/5" : ""}`}>
                              <div className="col-span-1">
                                <div className="h-8 w-8 rounded-md bg-muted overflow-hidden border border-border">
                                  {imgSrc && <img src={imgSrc} alt="" className="h-full w-full object-cover" />}
                                </div>
                              </div>
                              <div className="col-span-4 min-w-0">
                                <p className="text-sm font-medium truncate">{p.name}</p>
                                {!p.is_active && <span className="text-[10px] text-muted-foreground">hidden</span>}
                              </div>
                              <span className="col-span-2 text-xs text-muted-foreground capitalize truncate">
                                {p.category.replace(/-/g, " ")}
                              </span>
                              <span className="col-span-2 text-[10px] font-mono text-muted-foreground truncate">
                                {p.sku ?? "—"}
                              </span>
                              <div className="col-span-1 flex justify-center">
                                <span className="text-xs text-muted-foreground">{rp}</span>
                              </div>
                              <div className="col-span-2 flex justify-center">
                                <div className="flex items-center gap-1.5">
                                  <div className="h-2 w-2 rounded-full shrink-0"
                                    style={{ backgroundColor: stockColor(p.stock, rp) }} />
                                  <Input
                                    type="number" min="0"
                                    value={currentEdit}
                                    onChange={(e) => setEdits((prev) => ({ ...prev, [p.id]: e.target.value }))}
                                    className={`h-7 w-20 text-center text-sm px-1 ${isDirty ? "border-primary ring-1 ring-primary/30" : ""}`}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* CSV upload */}
                <div className="space-y-3">
                  <div>
                    <h2 className="text-xl font-semibold">CSV import</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Upload a CSV with columns: <code className="bg-muted px-1 rounded text-xs">sku, stock, note</code>.
                      SKUs must match your product catalog exactly.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" /> Choose CSV file
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const sample = "sku,stock,note\nKCS-STAT-XXXXX,50,Restock Feb\nKCS-ORNA-YYYYY,25,";
                        const blob = new Blob([sample], { type: "text/csv" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url; a.download = "stock-import-template.csv"; a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" /> Download template
                    </Button>
                  </div>

                  {csvError && (
                    <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{csvError}</p>
                  )}

                  {csvRows.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{csvRows.length} row{csvRows.length !== 1 ? "s" : ""} ready to import</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setCsvRows([]); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                            <X className="h-3.5 w-3.5 mr-1" /> Clear
                          </Button>
                          <Button size="sm" onClick={handleCsvUpload} disabled={csvUploading}>
                            <Upload className="h-3.5 w-3.5 mr-1.5" />
                            {csvUploading ? "Importing…" : "Import"}
                          </Button>
                        </div>
                      </div>

                      <div className="border border-border rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted sticky top-0">
                            <tr>
                              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">SKU</th>
                              <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">New stock</th>
                              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Note</th>
                              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Match</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {csvRows.map((row, i) => {
                              const matched = allProducts.find(
                                (p) => p.sku?.toUpperCase() === row.sku.toUpperCase()
                              );
                              return (
                                <tr key={i} className={!matched ? "bg-red-50/50" : ""}>
                                  <td className="px-3 py-2 font-mono text-xs">{row.sku}</td>
                                  <td className="px-3 py-2 text-center font-semibold">{row.stock}</td>
                                  <td className="px-3 py-2 text-xs text-muted-foreground">{row.note || "—"}</td>
                                  <td className="px-3 py-2">
                                    {matched
                                      ? <span className="text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded">✓ {matched.name.slice(0, 20)}</span>
                                      : <span className="text-xs text-red-700 bg-red-50 px-1.5 py-0.5 rounded">✗ Not found</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── AUDIT LOG TAB ─────────────────────────────────────────── */}
            {activeTab === "logs" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h2 className="text-xl font-semibold">Stock audit log</h2>
                  <div className="flex items-center gap-2">
                    <select
                      value={logReason}
                      onChange={(e) => { setLogReason(e.target.value); setLogPage(1); }}
                      className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">All reasons</option>
                      {["order", "cancellation", "restock", "manual_adjust", "bulk_update", "correction", "return"].map((r) => (
                        <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Card className="p-4">
                  {fetching ? (
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
                    </div>
                  ) : logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No stock changes found for the selected filter.
                    </p>
                  ) : (
                    <>
                      {logs.map((log) => <LogRow key={log.id} log={log} />)}
                      {logPages > 1 && (
                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
                          <Button variant="outline" size="sm" disabled={logPage <= 1}
                            onClick={() => setLogPage((p) => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Page {logPage} of {logPages} · {logTotal} entries
                          </span>
                          <Button variant="outline" size="sm" disabled={logPage >= logPages}
                            onClick={() => setLogPage((p) => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </Card>
              </div>
            )}

            {/* ── EXPORT TAB ────────────────────────────────────────────── */}
            {activeTab === "export" && (
              <div className="space-y-4 max-w-xl">
                <h2 className="text-xl font-semibold">Export reports</h2>
                <p className="text-sm text-muted-foreground">Download your inventory data as CSV files for use in spreadsheets.</p>

                <Card className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">Inventory snapshot</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        All {allProducts.length} products with current stock, reorder points, and inventory values.
                      </p>
                    </div>
                    <Button variant="outline" onClick={exportInventoryCSV} disabled={fetching}>
                      <Download className="h-4 w-4 mr-2" /> Download CSV
                    </Button>
                  </div>

                  <div className="border-t border-border pt-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">Stock audit log</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Last 200 stock change entries with product, change amount, reason, and timestamps.
                      </p>
                    </div>
                    <Button variant="outline" onClick={exportLogsCSV}>
                      <Download className="h-4 w-4 mr-2" /> Download CSV
                    </Button>
                  </div>

                  <div className="border-t border-border pt-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">Low stock report</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {lowStock.length} products currently at or below their reorder point.
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => {
                      const rows = lowStock.map((p) => ({
                        SKU: p.sku ?? "",
                        Name: p.name,
                        Category: p.category,
                        Stock: p.stock,
                        ReorderPoint: p.reorder_point ?? 5,
                        Status: p.stock === 0 ? "Out of stock" : "Low stock",
                      }));
                      downloadCSV(rows, `low-stock-${new Date().toISOString().slice(0, 10)}.csv`);
                    }} disabled={lowStock.length === 0}>
                      <Download className="h-4 w-4 mr-2" /> Download CSV
                    </Button>
                  </div>
                </Card>
              </div>
            )}

          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

// Inline icon to avoid BarChart2 name collision with recharts import
function BarChart2Icon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
