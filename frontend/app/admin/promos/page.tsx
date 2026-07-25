"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  getPromoCodes, createPromoCode, updatePromoCode, togglePromoCode, deletePromoCode,
  type PromoCodeInput,
} from "@/lib/api";
import type { PromoCode } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Info, Percent, IndianRupee } from "lucide-react";

const emptyForm: PromoCodeInput & { code: string } = {
  code: "",
  description: "",
  type: "percent",
  value: 10,
  min_order: 0,
  max_discount: null,
  per_customer_limit: 1,
  is_active: true,
  expires_at: null,
};

// Human-readable summary of what a code gives, e.g. "10% off (up to ₹300)".
function describeDiscount(p: Pick<PromoCode, "type" | "value" | "max_discount">) {
  if (p.type === "percent") {
    return `${p.value}% off${p.max_discount != null ? ` (up to ₹${p.max_discount})` : ""}`;
  }
  return `₹${p.value} off`;
}

export default function PromoCodesPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) router.push("/");
  }, [user, isAdmin, authLoading, router]);

  const load = () => {
    getPromoCodes()
      .then(setCodes)
      .catch((e) => toast.error(e.message || "Failed to load promo codes"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user || !isAdmin) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  const setField = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: PromoCode) => {
    setEditingId(p.id);
    setForm({
      code: p.code,
      description: p.description,
      type: p.type,
      value: p.value,
      min_order: p.min_order,
      max_discount: p.max_discount,
      per_customer_limit: p.per_customer_limit,
      is_active: p.is_active,
      expires_at: p.expires_at ? p.expires_at.slice(0, 10) : null,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!editingId && !/^[A-Za-z0-9]{3,32}$/.test(form.code.trim())) {
      toast.error("Code must be 3–32 letters/numbers, no spaces");
      return;
    }
    if (!form.value || form.value <= 0) {
      toast.error("Discount value must be greater than 0");
      return;
    }
    setSaving(true);
    try {
      const payload: PromoCodeInput = {
        description: form.description,
        type: form.type,
        value: Number(form.value),
        min_order: Number(form.min_order) || 0,
        max_discount: form.type === "percent" && form.max_discount ? Number(form.max_discount) : null,
        per_customer_limit: Number(form.per_customer_limit) || 0,
        is_active: form.is_active,
        expires_at: form.expires_at || null,
      };
      if (editingId) {
        await updatePromoCode(editingId, payload);
        toast.success("Promo code updated");
      } else {
        await createPromoCode({ ...payload, code: form.code.trim().toUpperCase() });
        toast.success("Promo code created");
      }
      setDialogOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (p: PromoCode) => {
    try {
      const updated = await togglePromoCode(p.id, !p.is_active);
      setCodes((cs) => cs.map((c) => (c.id === p.id ? updated : c)));
    } catch (e: any) {
      toast.error(e.message || "Failed to update");
    }
  };

  const remove = async (p: PromoCode) => {
    if (!confirm(`Delete promo code "${p.code}"? This cannot be undone.`)) return;
    try {
      await deletePromoCode(p.id);
      setCodes((cs) => cs.filter((c) => c.id !== p.id));
      toast.success("Promo code deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  if (authLoading || loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AdminSidebar />
          <div className="flex-1 p-6 space-y-4">
            <Skeleton className="h-10 w-64 rounded-xl" />
            <Skeleton className="h-32 rounded-3xl" />
            <Skeleton className="h-32 rounded-3xl" />
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <AdminHeader>
            <Button onClick={openCreate} size="sm" className="rounded-full h-8 bg-gradient-primary text-primary-foreground border-0 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New code
            </Button>
          </AdminHeader>

          <main className="flex-1 p-6 space-y-4 max-w-3xl">
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-sm text-blue-800">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Customers enter these codes at checkout to get a discount. Changes take effect immediately.
                Deactivate a code to pause it without deleting its usage history.
              </p>
            </div>

            {codes.length === 0 ? (
              <Card className="p-10 rounded-3xl text-center text-muted-foreground">
                No promo codes yet. Create your first one.
              </Card>
            ) : (
              codes.map((p) => (
                <Card key={p.id} className="p-5 rounded-3xl">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-lg tracking-wide bg-muted px-2.5 py-1 rounded-lg">
                          {p.code}
                        </span>
                        {p.is_active ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        {p.type === "percent" ? <Percent className="h-3.5 w-3.5 text-primary" /> : <IndianRupee className="h-3.5 w-3.5 text-primary" />}
                        {describeDiscount(p)}
                        {p.min_order > 0 && <span className="text-muted-foreground font-normal">· min order ₹{p.min_order}</span>}
                      </p>
                      {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                      <p className="text-xs text-muted-foreground">
                        {p.per_customer_limit === 0 ? "Unlimited per customer" : `${p.per_customer_limit} use${p.per_customer_limit !== 1 ? "s" : ""} per customer`}
                        {" · "}
                        Redeemed {p.used_count} time{p.used_count !== 1 ? "s" : ""} by {p.customers_used} customer{p.customers_used !== 1 ? "s" : ""}
                        {p.expires_at && ` · expires ${new Date(p.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center gap-1.5 mr-1">
                        <Switch checked={p.is_active} onCheckedChange={() => toggle(p)} />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)} className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(p)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </main>
        </div>
      </div>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit promo code" : "New promo code"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update the discount settings for this code." : "Create a code customers can apply at checkout."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setField("code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                placeholder="e.g. WELCOME10"
                disabled={!!editingId}
                className="mt-1.5 font-mono uppercase tracking-wide"
              />
              {editingId && <p className="text-[11px] text-muted-foreground mt-1">The code itself can't be changed. Delete and recreate to rename.</p>}
            </div>

            <div>
              <Label>Discount type</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(["percent", "flat"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setField("type", t)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-sm font-medium transition-colors ${
                      form.type === t ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border hover:bg-muted/60"
                    }`}
                  >
                    {t === "percent" ? <Percent className="h-4 w-4" /> : <IndianRupee className="h-4 w-4" />}
                    {t === "percent" ? "Percentage" : "Flat amount"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{form.type === "percent" ? "Percentage (%)" : "Amount (₹)"}</Label>
                <Input
                  type="number" min="0"
                  value={form.value || ""}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setField("value", Number(e.target.value) || 0)}
                  className="mt-1.5"
                />
              </div>
              {form.type === "percent" && (
                <div>
                  <Label>Max discount (₹)</Label>
                  <Input
                    type="number" min="0"
                    value={form.max_discount ?? ""}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setField("max_discount", e.target.value === "" ? null : Number(e.target.value))}
                    placeholder="No cap"
                    className="mt-1.5"
                  />
                </div>
              )}
              <div>
                <Label>Min order (₹)</Label>
                <Input
                  type="number" min="0"
                  value={form.min_order || ""}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setField("min_order", Number(e.target.value) || 0)}
                  placeholder="0"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Uses per customer</Label>
                <Input
                  type="number" min="0"
                  value={form.per_customer_limit}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setField("per_customer_limit", Number(e.target.value) || 0)}
                  className="mt-1.5"
                />
                <p className="text-[11px] text-muted-foreground mt-1">0 = unlimited</p>
              </div>
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Input
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Shown to you in this list"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Expiry date (optional)</Label>
              <Input
                type="date"
                value={form.expires_at ?? ""}
                onChange={(e) => setField("expires_at", e.target.value || null)}
                className="mt-1.5"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <Label className="cursor-pointer">Active</Label>
              <Switch checked={form.is_active} onCheckedChange={(c) => setField("is_active", c)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-full">Cancel</Button>
            <Button onClick={save} disabled={saving} className="rounded-full bg-gradient-primary text-primary-foreground border-0">
              {saving ? "Saving…" : editingId ? "Save changes" : "Create code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
