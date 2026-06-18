"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/shop/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, RefreshCw, ShoppingCart, Trash2, ChevronDown, ChevronUp,
  CheckCircle2, Send, X, Eye, Package,
} from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";
import {
  apiFetch, getSuppliers, getPurchaseOrders, createPurchaseOrder,
  updatePOStatus, deletePurchaseOrder,
} from "@/lib/api";
import type { PurchaseOrder, Supplier, Product, POStatus } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusConfig: Record<POStatus, { label: string; className: string }> = {
  draft:     { label: "Draft",     className: "bg-gray-100 text-gray-700 border-gray-200" },
  sent:      { label: "Sent",      className: "bg-blue-100 text-blue-700 border-blue-200" },
  received:  { label: "Received",  className: "bg-green-100 text-green-700 border-green-200" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700 border-red-200" },
};

const nextStatus: Partial<Record<POStatus, { status: POStatus; label: string; icon: React.ElementType }>> = {
  draft: { status: "sent",     label: "Mark as sent",     icon: Send },
  sent:  { status: "received", label: "Mark as received", icon: CheckCircle2 },
};

function SupplierName(s: PurchaseOrder["supplier"]) {
  if (typeof s === "object" && s !== null) return s.name;
  return String(s);
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PurchaseOrdersPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(true);

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createSupId, setCreateSupId] = useState("");
  const [createExpected, setCreateExpected] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [createItems, setCreateItems] = useState<{
    productId: string; size: string; quantity: string; unitCost: string;
  }[]>([{ productId: "", size: "", quantity: "", unitCost: "" }]);
  const [creating, setCreating] = useState(false);

  // Detail / delete state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmReceive, setConfirmReceive] = useState<PurchaseOrder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.push(`/auth?redirect=${encodeURIComponent("/admin/purchase-orders")}`);
  }, [user, loading, router]);

  const loadAll = useCallback(async () => {
    if (!isAdmin) return;
    setFetching(true);
    try {
      const [poData, supData, prodData] = await Promise.all([
        getPurchaseOrders(),
        getSuppliers(),
        apiFetch("/api/products/all") as Promise<Product[]>,
      ]);
      setPOs(poData);
      setSuppliers(supData);
      setProducts(prodData);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setFetching(false);
    }
  }, [isAdmin]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Create PO ─────────────────────────────────────────────────────────────
  const addItem = () => setCreateItems((it) => [...it, { productId: "", size: "", quantity: "", unitCost: "" }]);
  const removeItem = (i: number) => setCreateItems((it) => it.filter((_, j) => j !== i));
  const setItem = (i: number, k: string, v: string) =>
    setCreateItems((it) => it.map((row, j) => j === i ? { ...row, [k]: v } : row));

  const handleCreate = async () => {
    if (!createSupId) { toast.error("Select a supplier"); return; }
    const validItems = createItems.filter((it) => it.productId && it.quantity && it.unitCost);
    if (validItems.length === 0) { toast.error("Add at least one item"); return; }

    setCreating(true);
    try {
      const itemPayload = validItems.map((it) => {
        const product = products.find((p) => p.id === it.productId);
        return {
          product: it.productId,
          productName: product?.name ?? "",
          sku: product?.sku ?? null,
          size: it.size || null,
          quantity: parseInt(it.quantity),
          unitCost: parseFloat(it.unitCost),
        };
      });

      await createPurchaseOrder({
        supplier: createSupId,
        items: itemPayload,
        expectedDelivery: createExpected || null,
        notes: createNotes || null,
      });
      toast.success("Purchase order created");
      setCreateOpen(false);
      setCreateSupId(""); setCreateExpected(""); setCreateNotes("");
      setCreateItems([{ productId: "", size: "", quantity: "", unitCost: "" }]);
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  // ── Status transition ─────────────────────────────────────────────────────
  const handleStatusChange = async (po: PurchaseOrder, newStatus: POStatus) => {
    if (newStatus === "received") {
      setConfirmReceive(po); return;
    }
    setActionLoading(po.id);
    try {
      await updatePOStatus(po.id, newStatus);
      toast.success(`PO marked as ${newStatus}`);
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const confirmReceivePO = async () => {
    if (!confirmReceive) return;
    setActionLoading(confirmReceive.id);
    try {
      await updatePOStatus(confirmReceive.id, "received");
      toast.success("PO received — stock has been updated automatically");
      setConfirmReceive(null);
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (po: PurchaseOrder) => {
    setActionLoading(po.id);
    try {
      await updatePOStatus(po.id, "cancelled");
      toast.success("PO cancelled");
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id);
    try {
      await deletePurchaseOrder(deleteTarget.id);
      toast.success("PO deleted");
      setDeleteTarget(null);
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Summaries ─────────────────────────────────────────────────────────────
  const draftCount    = pos.filter((p) => p.status === "draft").length;
  const sentCount     = pos.filter((p) => p.status === "sent").length;
  const receivedCount = pos.filter((p) => p.status === "received").length;

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
            <span className="ml-2 text-sm text-muted-foreground">Admin / Purchase Orders</span>
          </div>
          <main className="container py-8 space-y-6">

            {/* Header */}
            <div className="flex items-end justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-4xl font-bold">Purchase Orders</h1>
                <p className="text-muted-foreground mt-1">Track supplier orders and auto-restock inventory on receipt</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={loadAll} disabled={fetching}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${fetching ? "animate-spin" : ""}`} /> Refresh
                </Button>
                <Button onClick={() => setCreateOpen(true)} disabled={suppliers.length === 0}>
                  <Plus className="h-4 w-4 mr-2" /> New PO
                </Button>
              </div>
            </div>

            {suppliers.length === 0 && !fetching && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                No suppliers found. <a href="/admin/suppliers" className="font-semibold underline underline-offset-2">Add a supplier first</a> before creating purchase orders.
              </div>
            )}

            {/* Summary cards */}
            {!fetching && (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Draft", value: draftCount, color: "bg-gray-500" },
                  { label: "Sent", value: sentCount, color: "bg-blue-500" },
                  { label: "Received", value: receivedCount, color: "bg-green-600" },
                ].map((s) => (
                  <Card key={s.label} className="p-4 flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                    <div>
                      <p className="text-2xl font-bold">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* PO list */}
            {fetching ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : pos.length === 0 ? (
              <Card className="p-12 text-center space-y-3">
                <ShoppingCart className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                <h2 className="text-lg font-semibold">No purchase orders yet</h2>
                <p className="text-muted-foreground text-sm">Create a PO to track stock replenishment from your suppliers.</p>
                <Button onClick={() => setCreateOpen(true)} disabled={suppliers.length === 0} className="mt-2">
                  <Plus className="h-4 w-4 mr-2" /> New purchase order
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {pos.map((po) => {
                  const cfg = statusConfig[po.status];
                  const next = nextStatus[po.status];
                  const isExpanded = expandedId === po.id;
                  const supplierName = typeof po.supplier === "object" ? po.supplier.name : po.supplier;

                  return (
                    <Card key={po.id} className="overflow-hidden">
                      {/* PO row */}
                      <div className="flex items-center gap-4 p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-semibold text-sm">{po.poNumber}</span>
                            <Badge variant="outline" className={`text-[10px] border ${cfg.className}`}>
                              {cfg.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {supplierName} ·{" "}
                            {po.items.length} item{po.items.length !== 1 ? "s" : ""} ·{" "}
                            ₹{po.totalCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                            {po.expectedDelivery && ` · Due ${new Date(po.expectedDelivery).toLocaleDateString("en-IN")}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Next step button */}
                          {next && po.status !== "cancelled" && (
                            <Button size="sm" variant="outline"
                              disabled={actionLoading === po.id}
                              onClick={() => handleStatusChange(po, next.status)}>
                              <next.icon className="h-3.5 w-3.5 mr-1.5" />
                              {next.label}
                            </Button>
                          )}

                          {/* Cancel button for non-terminal states */}
                          {(po.status === "draft" || po.status === "sent") && (
                            <Button size="sm" variant="ghost"
                              className="text-muted-foreground hover:text-destructive"
                              disabled={actionLoading === po.id}
                              onClick={() => handleCancel(po)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {/* Delete button for draft/cancelled only */}
                          {(po.status === "draft" || po.status === "cancelled") && (
                            <Button size="sm" variant="ghost"
                              className="text-muted-foreground hover:text-destructive"
                              disabled={actionLoading === po.id}
                              onClick={() => setDeleteTarget(po)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {/* Expand toggle */}
                          <Button size="sm" variant="ghost" onClick={() => setExpandedId(isExpanded ? null : po.id)}>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      {/* Expanded items */}
                      {isExpanded && (
                        <div className="border-t border-border bg-muted/30 px-4 py-3 space-y-2">
                          {po.notes && (
                            <p className="text-xs text-muted-foreground italic mb-2">Note: {po.notes}</p>
                          )}
                          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 pb-1">
                            <span className="col-span-5">Product</span>
                            <span className="col-span-2 text-center">Size</span>
                            <span className="col-span-2 text-center">Qty</span>
                            <span className="col-span-2 text-center">Unit cost</span>
                            <span className="col-span-1 text-right">Subtotal</span>
                          </div>
                          {po.items.map((item, i) => (
                            <div key={i} className="grid grid-cols-12 gap-2 text-sm items-center px-1">
                              <div className="col-span-5 min-w-0">
                                <p className="truncate font-medium text-sm">{item.productName}</p>
                                {item.sku && <p className="text-[10px] font-mono text-muted-foreground">{item.sku}</p>}
                              </div>
                              <span className="col-span-2 text-center text-muted-foreground">{item.size || "—"}</span>
                              <span className="col-span-2 text-center font-semibold">{item.quantity}</span>
                              <span className="col-span-2 text-center text-muted-foreground">
                                ₹{item.unitCost.toLocaleString("en-IN")}
                              </span>
                              <span className="col-span-1 text-right font-medium">
                                ₹{(item.quantity * item.unitCost).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-end pt-2 border-t border-border/60">
                            <span className="text-sm font-bold">
                              Total: ₹{po.totalCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                          {po.receivedAt && (
                            <p className="text-xs text-green-700 bg-green-50 rounded px-2 py-1">
                              Received on {new Date(po.receivedAt).toLocaleDateString("en-IN", { dateStyle: "long" })} — stock updated automatically.
                            </p>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}

          </main>
        </div>
      </div>

      {/* ── Create PO dialog ────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New purchase order</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Supplier *</Label>
                <select
                  value={createSupId}
                  onChange={(e) => setCreateSupId(e.target.value)}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select supplier…</option>
                  {suppliers.filter((s) => s.isActive).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Expected delivery</Label>
                <Input type="date" value={createExpected} onChange={(e) => setCreateExpected(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input placeholder="Payment terms, delivery instructions…" value={createNotes} onChange={(e) => setCreateNotes(e.target.value)} />
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items *</Label>
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add item
                </Button>
              </div>

              {createItems.map((item, i) => {
                const selectedProduct = products.find((p) => p.id === item.productId);
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 items-start bg-muted/40 rounded-xl p-3">
                    <div className="col-span-5 space-y-1">
                      <select
                        value={item.productId}
                        onChange={(e) => setItem(i, "productId", e.target.value)}
                        className="w-full h-9 rounded-lg border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="">Select product…</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      {selectedProduct?.sizes && selectedProduct.sizes.length > 0 ? (
                        <select
                          value={item.size}
                          onChange={(e) => setItem(i, "size", e.target.value)}
                          className="w-full h-9 rounded-lg border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">All sizes</option>
                          {selectedProduct.sizes.map((sz) => (
                            <option key={sz.label} value={sz.label}>{sz.label}</option>
                          ))}
                        </select>
                      ) : (
                        <Input placeholder="Size" value={item.size} onChange={(e) => setItem(i, "size", e.target.value)} className="h-9" />
                      )}
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number" min="1" placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => setItem(i, "quantity", e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number" min="0" placeholder="Unit ₹"
                        value={item.unitCost}
                        onChange={(e) => setItem(i, "unitCost", e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end pt-1">
                      {createItems.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeItem(i)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Running total */}
            {createItems.some((it) => it.quantity && it.unitCost) && (
              <div className="flex justify-end text-sm font-semibold">
                Total: ₹{createItems.reduce((s, it) => {
                  const q = parseInt(it.quantity) || 0;
                  const c = parseFloat(it.unitCost) || 0;
                  return s + q * c;
                }, 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating…" : "Create PO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm receive dialog ──────────────────────────────────────── */}
      <Dialog open={!!confirmReceive} onOpenChange={(o) => { if (!o) setConfirmReceive(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm receipt?</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-sm text-muted-foreground">
              Marking <span className="font-semibold text-foreground">{confirmReceive?.poNumber}</span> as received will automatically
              add the following stock:
            </p>
            {confirmReceive?.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-muted rounded-lg px-3 py-2">
                <span className="font-medium">{item.productName}{item.size ? ` · ${item.size}` : ""}</span>
                <span className="text-green-700 font-semibold">+{item.quantity}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReceive(null)}>Cancel</Button>
            <Button onClick={confirmReceivePO} disabled={actionLoading === confirmReceive?.id}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {actionLoading === confirmReceive?.id ? "Processing…" : "Confirm & restock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ─────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete purchase order?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This will permanently delete <span className="font-semibold text-foreground">{deleteTarget?.poNumber}</span>.
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={actionLoading === deleteTarget?.id}>
              {actionLoading === deleteTarget?.id ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </SidebarProvider>
  );
}
