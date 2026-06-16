"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/shop/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Package, AlertTriangle, TrendingDown, DollarSign,
  RefreshCw, Save, ChevronRight, ChevronLeft,
} from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";
import {
  apiFetch, getLowStockProducts, getStockLogs, bulkUpdateStock,
} from "@/lib/api";
import type { Product, StockLog } from "@/lib/types";

// ── Colour helpers ────────────────────────────────────────────────────────────
const stockColor = (stock: number, reorder: number) => {
  if (stock === 0) return "#ef4444";
  if (stock <= reorder) return "#f59e0b";
  return "#22c55e";
};

// ── Stat card ─────────────────────────────────────────────────────────────────
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

// ── Audit log row ─────────────────────────────────────────────────────────────
function LogRow({ log }: { log: StockLog }) {
  const name = typeof log.product === "object" ? log.product.name : log.productName;
  const isDeduct = log.change < 0;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0 text-sm">
      <span className={`font-mono font-bold w-12 text-right shrink-0 ${isDeduct ? "text-red-500" : "text-green-600"}`}>
        {isDeduct ? "" : "+"}{log.change}
      </span>
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium">{name}{log.size && ` – ${log.size}`}</p>
        <p className="text-xs text-muted-foreground">
          {log.stockBefore} → {log.stockAfter}
          {log.orderId && ` · order ${log.orderId}`}
          {log.note && ` · ${log.note}`}
        </p>
      </div>
      <Badge variant="outline" className="text-[10px] shrink-0 capitalize">{log.reason.replace(/_/g, " ")}</Badge>
      <span className="text-xs text-muted-foreground shrink-0 hidden md:block">
        {new Date(log.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [fetching, setFetching] = useState(true);

  // Bulk edit state: productId → edited stock value
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) router.push(`/auth?redirect=${encodeURIComponent("/admin/inventory")}`);
  }, [user, loading, router]);

  const loadAll = useCallback(async () => {
    if (!isAdmin) return;
    setFetching(true);
    try {
      const [prods, low, logRes] = await Promise.all([
        apiFetch("/api/products/all") as Promise<Product[]>,
        getLowStockProducts(),
        getStockLogs({ limit: 30, page: logPage }),
      ]);
      setAllProducts(prods);
      setLowStock(low);
      setLogs(logRes.logs);
      setLogTotal(logRes.total);
      // Seed edits with current stock values
      const seed: Record<string, string> = {};
      prods.forEach((p) => { seed[p.id] = String(p.stock); });
      setEdits(seed);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setFetching(false);
    }
  }, [isAdmin, logPage]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Derived stats ───────────────────────────────────────────────────────────
  const totalProducts   = allProducts.length;
  const outOfStock      = allProducts.filter((p) => p.stock === 0).length;
  const lowStockCount   = allProducts.filter((p) => p.stock > 0 && p.stock <= (p.reorder_point ?? 5)).length;
  const totalValue      = allProducts.reduce((s, p) => s + p.price * p.stock, 0);

  // Category stock bar chart data
  const categoryData = Object.values(
    allProducts.reduce<Record<string, { category: string; stock: number; products: number }>>((acc, p) => {
      const key = p.category;
      if (!acc[key]) acc[key] = { category: p.category.replace(/-/g, " "), stock: 0, products: 0 };
      acc[key].stock += p.stock;
      acc[key].products += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.stock - a.stock);

  // Stock status pie chart
  const pieData = [
    { name: "In stock", value: totalProducts - outOfStock - lowStockCount, fill: "#22c55e" },
    { name: "Low stock", value: lowStockCount, fill: "#f59e0b" },
    { name: "Out of stock", value: outOfStock, fill: "#ef4444" },
  ].filter((d) => d.value > 0);

  // ── Bulk save ───────────────────────────────────────────────────────────────
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

  const logPages = Math.ceil(logTotal / 30);

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
          <main className="container py-8 space-y-10">

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

            {/* ── Stat cards ────────────────────────────────────────────── */}
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

            {/* ── Charts ───────────────────────────────────────────────── */}
            {!fetching && allProducts.length > 0 && (
              <div className="grid md:grid-cols-3 gap-6">
                {/* Bar chart */}
                <Card className="md:col-span-2 p-5 space-y-3">
                  <h2 className="font-semibold">Stock by category</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={categoryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(v: number) => [`${v} units`, "Stock"]}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Bar dataKey="stock" radius={[4, 4, 0, 0]}>
                        {categoryData.map((entry, i) => (
                          <Cell key={i} fill={`hsl(${(i * 47) % 360} 60% 55%)`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                {/* Pie chart */}
                <Card className="p-5 space-y-3">
                  <h2 className="font-semibold">Stock status</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                        paddingAngle={3}>
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

            {/* ── Low stock alerts ──────────────────────────────────────── */}
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
                                    sz.stock === 0 ? "bg-red-100 text-red-700" :
                                    sz.stock <= rp ? "bg-amber-100 text-amber-700" :
                                    "bg-muted text-muted-foreground"
                                  }`}>
                                  {sz.label}: {sz.stock}
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

            {/* ── Bulk stock editor ─────────────────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-xl font-semibold">Bulk stock update</h2>
                <Button onClick={handleBulkSave} disabled={saving || fetching}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving…" : "Save all changes"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Edit stock numbers below and click "Save all changes". Only modified rows are updated.
              </p>

              {fetching ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <span className="col-span-1"></span>
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

            {/* ── Audit log ────────────────────────────────────────────── */}
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">Stock audit log</h2>
              <Card className="p-4">
                {fetching ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
                  </div>
                ) : logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No stock changes yet. They'll appear here after orders are placed or stock is adjusted.
                  </p>
                ) : (
                  <>
                    {logs.map((log) => <LogRow key={log.id} log={log} />)}

                    {/* Pagination */}
                    {logPages > 1 && (
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
                        <Button variant="outline" size="sm"
                          disabled={logPage <= 1}
                          onClick={() => setLogPage((p) => p - 1)}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {logPage} of {logPages} · {logTotal} entries
                        </span>
                        <Button variant="outline" size="sm"
                          disabled={logPage >= logPages}
                          onClick={() => setLogPage((p) => p + 1)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </Card>
            </div>

          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
