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
import { Plus, Pencil, Trash2, Truck, RefreshCw, Phone, Mail, Globe, MapPin, User } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from "@/lib/api";
import type { Supplier } from "@/lib/types";

const EMPTY_FORM = {
  name: "", contactPerson: "", email: "", phone: "",
  address: "", website: "", notes: "", isActive: true,
};

export default function SuppliersPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [fetching, setFetching] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) router.push(`/auth?redirect=${encodeURIComponent("/admin/suppliers")}`);
  }, [user, loading, router]);

  const loadSuppliers = useCallback(async () => {
    if (!isAdmin) return;
    setFetching(true);
    try {
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setFetching(false);
    }
  }, [isAdmin]);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      name: s.name,
      contactPerson: s.contactPerson ?? "",
      email: s.email ?? "",
      phone: s.phone ?? "",
      address: s.address ?? "",
      website: s.website ?? "",
      notes: s.notes ?? "",
      isActive: s.isActive,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Supplier name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        contactPerson: form.contactPerson || null,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        website: form.website || null,
        notes: form.notes || null,
      };
      if (editing) {
        await updateSupplier(editing.id, payload);
        toast.success("Supplier updated");
      } else {
        await createSupplier(payload as any);
        toast.success("Supplier added");
      }
      setDialogOpen(false);
      loadSuppliers();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSupplier(deleteTarget.id);
      toast.success("Supplier deleted");
      setDeleteTarget(null);
      loadSuppliers();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const setField = (k: keyof typeof EMPTY_FORM, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

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
            <span className="ml-2 text-sm text-muted-foreground">Admin / Suppliers</span>
          </div>
          <main className="container py-8 space-y-6">

            {/* Header */}
            <div className="flex items-end justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-4xl font-bold">Suppliers</h1>
                <p className="text-muted-foreground mt-1">Manage your vendor and supplier contacts</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={loadSuppliers} disabled={fetching}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${fetching ? "animate-spin" : ""}`} /> Refresh
                </Button>
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-2" /> Add supplier
                </Button>
              </div>
            </div>

            {/* Table */}
            {fetching ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
              </div>
            ) : suppliers.length === 0 ? (
              <Card className="p-12 text-center space-y-3">
                <Truck className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                <h2 className="text-lg font-semibold">No suppliers yet</h2>
                <p className="text-muted-foreground text-sm">Add your first supplier to start tracking purchase orders.</p>
                <Button onClick={openCreate} className="mt-2">
                  <Plus className="h-4 w-4 mr-2" /> Add supplier
                </Button>
              </Card>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden">
                {/* Header row */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <span className="col-span-3">Name</span>
                  <span className="col-span-2">Contact</span>
                  <span className="col-span-2">Email</span>
                  <span className="col-span-2">Phone</span>
                  <span className="col-span-2">Status</span>
                  <span className="col-span-1" />
                </div>
                {suppliers.map((s) => (
                  <div key={s.id} className="grid grid-cols-12 gap-2 px-4 py-3.5 items-center border-t border-border hover:bg-accent/30 transition-colors">
                    <div className="col-span-3 min-w-0">
                      <p className="font-medium text-sm truncate">{s.name}</p>
                      {s.address && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="h-3 w-3 shrink-0" /> {s.address}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2 text-sm text-muted-foreground truncate">
                      {s.contactPerson ? (
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 shrink-0" /> {s.contactPerson}
                        </span>
                      ) : "—"}
                    </div>
                    <div className="col-span-2 text-sm truncate">
                      {s.email ? (
                        <a href={`mailto:${s.email}`} className="flex items-center gap-1 text-primary hover:underline">
                          <Mail className="h-3.5 w-3.5 shrink-0" /> {s.email}
                        </a>
                      ) : "—"}
                    </div>
                    <div className="col-span-2 text-sm text-muted-foreground truncate">
                      {s.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 shrink-0" /> {s.phone}
                        </span>
                      ) : "—"}
                    </div>
                    <div className="col-span-2">
                      <Badge className={s.isActive ? "bg-green-100 text-green-700 border-green-200 border" : "bg-gray-100 text-gray-600 border border-gray-200"}>
                        {s.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="col-span-1 flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(s)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </main>
        </div>
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit supplier" : "Add supplier"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input placeholder="Supplier Co." value={form.name} onChange={(e) => setField("name", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Contact person</Label>
                <Input placeholder="Priya Sharma" value={form.contactPerson} onChange={(e) => setField("contactPerson", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input placeholder="+91 98765 43210" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="orders@supplier.com" value={form.email} onChange={(e) => setField("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input placeholder="12 Market Road, Pune, Maharashtra" value={form.address} onChange={(e) => setField("address", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input placeholder="https://supplier.com" value={form.website} onChange={(e) => setField("website", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <textarea
                rows={3}
                placeholder="Lead times, payment terms, etc."
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            {editing && (
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setField("isActive", e.target.checked)}
                  className="rounded accent-primary"
                />
                Active supplier
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete supplier?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This will permanently delete <span className="font-semibold text-foreground">{deleteTarget?.name}</span>.
            Past purchase orders will not be affected.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
