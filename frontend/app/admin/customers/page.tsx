"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/shop/Navbar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";
import { getAdminCustomers, updateCustomerRole } from "@/lib/api";
import { Search, Users, ChevronLeft, ChevronRight, Shield, ShoppingBag } from "lucide-react";

type Customer = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
};

const PAGE_SIZE = 20;

export default function CustomersPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [q, setQ] = useState("");
  const [draftQ, setDraftQ] = useState("");
  const [page, setPage] = useState(1);
  const [roleLoading, setRoleLoading] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.push(`/auth?redirect=${encodeURIComponent("/admin/customers")}`);
  }, [user, loading, router]);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setFetching(true);
    try {
      const data = await getAdminCustomers({ q: q || undefined, page, limit: PAGE_SIZE });
      setCustomers(data.customers);
      setTotal(data.total);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setFetching(false);
    }
  }, [isAdmin, q, page]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQ(draftQ.trim());
  };

  const handleRoleToggle = async (c: Customer) => {
    const newRole = c.role === "admin" ? "customer" : "admin";
    if (!confirm(`Change ${c.email}'s role to ${newRole}?`)) return;
    setRoleLoading(c.id);
    try {
      await updateCustomerRole(c.id, newRole as "customer" | "admin");
      setCustomers((prev) => prev.map((x) => x.id === c.id ? { ...x, role: newRole } : x));
      toast.success(`${c.email} is now ${newRole}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRoleLoading(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

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
            <span className="ml-2 text-sm text-muted-foreground">Admin / Customers</span>
          </div>
          <main className="container py-8 space-y-6">

            {/* Header */}
            <div className="flex items-end justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-4xl font-bold flex items-center gap-2">
                  <Users className="h-8 w-8 text-primary" /> Customers
                </h1>
                <p className="text-muted-foreground mt-1">
                  {fetching ? "Loading…" : `${total} registered customer${total !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email…"
                  value={draftQ}
                  onChange={(e) => setDraftQ(e.target.value)}
                  className="pl-9 rounded-full"
                />
              </div>
              <Button type="submit" variant="outline" className="rounded-full">Search</Button>
              {q && (
                <Button type="button" variant="ghost" className="rounded-full" onClick={() => { setDraftQ(""); setQ(""); setPage(1); }}>
                  Clear
                </Button>
              )}
            </form>

            {/* Table */}
            {fetching ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : customers.length === 0 ? (
              <Card className="p-12 text-center space-y-3">
                <Users className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                <p className="font-semibold text-lg">{q ? "No customers match your search" : "No customers yet"}</p>
              </Card>
            ) : (
              <>
                {/* Header row */}
                <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <span className="col-span-3">Customer</span>
                  <span className="col-span-2">Joined</span>
                  <span className="col-span-2 text-right">Orders</span>
                  <span className="col-span-2 text-right">Total spent</span>
                  <span className="col-span-1">Role</span>
                  <span className="col-span-2 text-right">Actions</span>
                </div>

                <div className="space-y-2">
                  {customers.map((c) => (
                    <Card key={c.id} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                        {/* Name + email */}
                        <div className="md:col-span-3 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                              {(c.name || c.email)[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold truncate text-sm">{c.name || "—"}</p>
                              <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                            </div>
                          </div>
                        </div>

                        {/* Joined */}
                        <div className="md:col-span-2 text-xs text-muted-foreground">
                          {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </div>

                        {/* Orders */}
                        <div className="md:col-span-2 flex items-center gap-1 md:justify-end">
                          <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-semibold">{c.orderCount}</span>
                        </div>

                        {/* Total spent */}
                        <div className="md:col-span-2 md:text-right">
                          <span className="text-sm font-bold">₹{c.totalSpent.toLocaleString("en-IN")}</span>
                        </div>

                        {/* Role badge */}
                        <div className="md:col-span-1">
                          <Badge variant={c.role === "admin" ? "default" : "outline"} className="text-xs capitalize">
                            {c.role === "admin" && <Shield className="h-3 w-3 mr-1" />}
                            {c.role}
                          </Badge>
                        </div>

                        {/* Actions */}
                        <div className="md:col-span-2 flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            disabled={roleLoading === c.id}
                            onClick={() => handleRoleToggle(c)}
                          >
                            {c.role === "admin" ? "Remove admin" : "Make admin"}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <Button variant="outline" size="icon" className="rounded-full" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <Button variant="outline" size="icon" className="rounded-full" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <p className="text-center text-xs text-muted-foreground">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} customers
                </p>
              </>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
