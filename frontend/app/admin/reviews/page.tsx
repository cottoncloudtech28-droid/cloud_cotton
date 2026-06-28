"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/shop/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Star, CheckCircle2, XCircle, Clock, Trash2, RefreshCw, Search,
  ChevronDown, MessageSquare, ShieldCheck, User,
} from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
type ReviewStatus = "pending" | "approved" | "rejected";

interface Review {
  id: string;
  product: { id: string; name: string; image_url?: string } | string;
  user: { id: string; name: string; email: string } | null;
  guest_name: string | null;
  guest_email: string | null;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatus;
  verified_purchase: boolean;
  admin_note: string | null;
  createdAt: string;
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<ReviewStatus | "all", { label: string; cls: string; icon: React.ReactNode }> = {
  all:      { label: "All",      cls: "bg-muted text-foreground border-border",                    icon: <MessageSquare className="h-3.5 w-3.5" /> },
  pending:  { label: "Pending",  cls: "bg-amber-50 text-amber-700 border-amber-200",               icon: <Clock className="h-3.5 w-3.5" /> },
  approved: { label: "Approved", cls: "bg-green-50 text-green-700 border-green-200",               icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-600 border-red-200",                    icon: <XCircle className="h-3.5 w-3.5" /> },
};

// ── Star display ──────────────────────────────────────────────────────────────
function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const sz = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn(sz, n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
      ))}
    </div>
  );
}

// ── Interactive star picker ───────────────────────────────────────────────────
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star className={cn(
            "h-6 w-6 transition-colors",
            n <= (hovered || value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
          )} />
        </button>
      ))}
    </div>
  );
}

// ── Reviewer display name ─────────────────────────────────────────────────────
function reviewerName(r: Review) {
  if (r.user && typeof r.user === "object") return r.user.name;
  return r.guest_name ?? "Anonymous";
}
function reviewerEmail(r: Review) {
  if (r.user && typeof r.user === "object") return r.user.email;
  return r.guest_email ?? null;
}
function productName(r: Review) {
  if (r.product && typeof r.product === "object") return r.product.name;
  return "Unknown product";
}
function productImage(r: Review) {
  if (r.product && typeof r.product === "object") return r.product.image_url ?? null;
  return null;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminReviewsPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "all">("pending");
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");

  // Edit sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Review | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editRating, setEditRating] = useState(5);
  const [saving, setSaving] = useState(false);

  // Bulk select
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.push(`/auth?redirect=${encodeURIComponent("/admin/reviews")}`);
  }, [user, loading, router]);

  const load = useCallback(async () => {
    setListLoading(true);
    try {
      const params = new URLSearchParams({ status: statusFilter, limit: "100" });
      if (search.trim()) params.set("q", search.trim());
      const data = await apiFetch(`/api/reviews/admin?${params}`);
      setReviews(data.reviews ?? []);
      setTotal(data.total ?? 0);
      setSelected(new Set());
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setListLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  // ── Single review actions ──────────────────────────────────────────────────
  const setStatus = async (id: string, status: ReviewStatus) => {
    try {
      const updated = await apiFetch(`/api/reviews/admin/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.success(`Review ${status}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteReview = async (id: string) => {
    if (!confirm("Delete this review permanently?")) return;
    try {
      await apiFetch(`/api/reviews/admin/${id}`, { method: "DELETE" });
      setReviews((prev) => prev.filter((r) => r.id !== id));
      if (expandedId === id) setExpandedId(null);
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // ── Edit sheet ──────────────────────────────────────────────────────────────
  const openEdit = (r: Review) => {
    setEditing(r);
    setEditNote(r.admin_note ?? "");
    setEditTitle(r.title ?? "");
    setEditBody(r.body ?? "");
    setEditRating(r.rating);
    setSheetOpen(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const updated = await apiFetch(`/api/reviews/admin/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          admin_note: editNote,
          title: editTitle,
          body: editBody,
          rating: editRating,
        }),
      });
      setReviews((prev) => prev.map((r) => (r.id === editing.id ? updated : r)));
      toast.success("Review updated");
      setSheetOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Bulk actions ────────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(reviews.map((r) => r.id)));
  const clearSelect = () => setSelected(new Set());

  const bulkAction = async (action: "approve" | "reject" | "delete") => {
    if (!selected.size) return;
    const word = action === "delete" ? "Delete" : action === "approve" ? "Approve" : "Reject";
    if (!confirm(`${word} ${selected.size} review(s)?`)) return;
    try {
      const data = await apiFetch("/api/reviews/admin/bulk", {
        method: "POST",
        body: JSON.stringify({ ids: [...selected], action }),
      });
      toast.success(`${data.affected} review(s) ${action}d`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // ── Search on Enter ──────────────────────────────────────────────────────────
  const submitSearch = () => setSearch(searchDraft);

  // ── Counts for filter tabs ──────────────────────────────────────────────────
  const counts = reviews.reduce(
    (acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; },
    {} as Record<string, number>
  );

  if (loading) return <AdminPageSkeleton />;

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="container py-12">
          <Card className="p-8 text-center max-w-lg mx-auto">
            <h1 className="text-2xl font-bold mb-2">Admin access required</h1>
            <p className="text-muted-foreground">Your account is not an admin.</p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <div className="h-10 flex items-center border-b px-2">
            <SidebarTrigger />
            <span className="ml-2 text-sm text-muted-foreground">Admin / Reviews</span>
          </div>

          <main className="container py-8 space-y-6">
            {/* Header */}
            <div className="flex items-end justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-4xl font-bold">Reviews</h1>
                <p className="text-muted-foreground mt-1">
                  {listLoading ? "Loading…" : `${total} review${total !== 1 ? "s" : ""} total`}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={load} disabled={listLoading}>
                <RefreshCw className={cn("h-4 w-4 mr-2", listLoading && "animate-spin")} />
                Refresh
              </Button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 flex-wrap">
              {(["all", "pending", "approved", "rejected"] as const).map((s) => {
                const cfg = STATUS_CFG[s];
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                      statusFilter === s
                        ? cfg.cls + " shadow-sm"
                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                    )}
                  >
                    {cfg.icon} {cfg.label}
                    {s !== "all" && counts[s] != null && (
                      <span className="ml-0.5 text-xs opacity-70">({counts[s]})</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="flex gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitSearch()}
                  placeholder="Search by content, name or email…"
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={submitSearch}>Search</Button>
              {search && (
                <Button variant="ghost" onClick={() => { setSearch(""); setSearchDraft(""); }}>
                  Clear
                </Button>
              )}
            </div>

            {/* Bulk toolbar */}
            {selected.size > 0 && (
              <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5">
                <span className="text-sm font-medium">{selected.size} selected</span>
                <div className="flex gap-2 ml-auto">
                  <Button size="sm" variant="outline" onClick={() => bulkAction("approve")}
                    className="text-green-700 border-green-200 hover:bg-green-50">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => bulkAction("reject")}
                    className="text-amber-700 border-amber-200 hover:bg-amber-50">
                    <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => bulkAction("delete")}
                    className="text-destructive border-destructive/30 hover:bg-destructive/5">
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearSelect}>Clear</Button>
                </div>
              </div>
            )}

            {/* Select all / none */}
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <button onClick={selected.size === reviews.length ? clearSelect : selectAll}
                  className="hover:text-foreground underline underline-offset-2 transition-colors">
                  {selected.size === reviews.length ? "Deselect all" : "Select all"}
                </button>
              </div>
            )}

            {/* List */}
            {listLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <Card className="p-12 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No reviews found.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {reviews.map((r) => {
                  const isExpanded = expandedId === r.id;
                  const cfg = STATUS_CFG[r.status];
                  const img = productImage(r);
                  return (
                    <Card key={r.id} className="overflow-hidden">
                      {/* Row */}
                      <div
                        className="p-4 flex items-start gap-3 cursor-pointer hover:bg-muted/40 transition-colors select-none"
                        onClick={() => setExpandedId(isExpanded ? null : r.id)}
                      >
                        {/* Checkbox */}
                        <div
                          className="mt-0.5 shrink-0"
                          onClick={(e) => { e.stopPropagation(); toggleSelect(r.id); }}
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(r.id)}
                            onChange={() => toggleSelect(r.id)}
                            className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        {/* Product thumbnail */}
                        <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden border border-border shrink-0">
                          {img
                            ? <img src={img} alt="" className="h-full w-full object-cover" />
                            : <div className="h-full w-full flex items-center justify-center text-muted-foreground/30 text-xs">?</div>
                          }
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Stars rating={r.rating} />
                            <span className={cn("text-[10px] border px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1", cfg.cls)}>
                              {cfg.icon} {cfg.label}
                            </span>
                            {r.verified_purchase && (
                              <span className="text-[10px] flex items-center gap-0.5 text-blue-600 border border-blue-200 bg-blue-50 px-1.5 py-0.5 rounded-full">
                                <ShieldCheck className="h-3 w-3" /> Verified
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium truncate mt-0.5">
                            {r.title ?? <span className="text-muted-foreground italic">No title</span>}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {productName(r)} · by {reviewerName(r)} · {new Date(r.createdAt).toLocaleDateString("en-IN")}
                          </p>
                        </div>

                        {/* Quick actions */}
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {r.status !== "approved" && (
                            <Button size="sm" variant="ghost"
                              onClick={() => setStatus(r.id, "approved")}
                              className="text-green-700 hover:bg-green-50 text-xs">
                              Approve
                            </Button>
                          )}
                          {r.status !== "rejected" && (
                            <Button size="sm" variant="ghost"
                              onClick={() => setStatus(r.id, "rejected")}
                              className="text-red-600 hover:bg-red-50 text-xs">
                              Reject
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => deleteReview(r.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        <ChevronDown className={cn(
                          "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
                          isExpanded && "rotate-180"
                        )} />
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="border-t border-border bg-muted/30 px-5 py-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Left: review content */}
                            <div className="space-y-3">
                              <Stars rating={r.rating} size="lg" />
                              {r.title && <p className="font-semibold text-lg">{r.title}</p>}
                              <p className="text-sm text-foreground/80 whitespace-pre-line">{r.body || <span className="italic text-muted-foreground">No body text</span>}</p>

                              <div className="pt-2 space-y-1 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5" />
                                  <span>{reviewerName(r)}</span>
                                  {reviewerEmail(r) && <span className="opacity-70">({reviewerEmail(r)})</span>}
                                  {r.verified_purchase && (
                                    <span className="flex items-center gap-0.5 text-blue-600 ml-1">
                                      <ShieldCheck className="h-3 w-3" /> Verified purchase
                                    </span>
                                  )}
                                </div>
                                <div>Product: <span className="text-foreground font-medium">{productName(r)}</span></div>
                                <div>Submitted: {new Date(r.createdAt).toLocaleString("en-IN")}</div>
                              </div>
                            </div>

                            {/* Right: admin actions */}
                            <div className="space-y-4">
                              {r.admin_note && (
                                <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
                                  <p className="font-semibold mb-0.5">Admin note</p>
                                  <p>{r.admin_note}</p>
                                </div>
                              )}

                              <div className="flex gap-2 flex-wrap">
                                {r.status !== "approved" && (
                                  <Button size="sm" onClick={() => setStatus(r.id, "approved")}
                                    className="bg-green-600 hover:bg-green-700 text-white">
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Approve
                                  </Button>
                                )}
                                {r.status !== "rejected" && (
                                  <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "rejected")}
                                    className="text-red-600 border-red-200 hover:bg-red-50">
                                    <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
                                  </Button>
                                )}
                                {r.status !== "pending" && (
                                  <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "pending")}
                                    className="text-amber-700 border-amber-200 hover:bg-amber-50">
                                    <Clock className="h-3.5 w-3.5 mr-1.5" /> Reset to Pending
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                                  Edit / Note
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => deleteReview(r.id)}
                                  className="text-destructive border-destructive/30 hover:bg-destructive/5">
                                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                                </Button>
                              </div>
                            </div>
                          </div>
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

      {/* ── Edit sheet ───────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={(o) => { if (!o) setSheetOpen(false); }}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader className="border-b pb-4">
            <SheetTitle>Edit Review</SheetTitle>
            <SheetDescription>Modify review content or add an internal admin note.</SheetDescription>
          </SheetHeader>
          {editing && (
            <div className="flex-1 overflow-y-auto py-4 space-y-5">
              <div className="space-y-1">
                <Label>Rating</Label>
                <StarPicker value={editRating} onChange={setEditRating} />
              </div>
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={120} />
              </div>
              <div className="space-y-1">
                <Label>Body</Label>
                <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)}
                  rows={5} maxLength={2000} />
                <p className="text-xs text-muted-foreground text-right">{editBody.length}/2000</p>
              </div>
              <div className="space-y-1">
                <Label>Admin note <span className="text-muted-foreground font-normal">(internal only)</span></Label>
                <Textarea value={editNote} onChange={(e) => setEditNote(e.target.value)}
                  rows={3} maxLength={500} placeholder="Reason for approval/rejection, notes for audit trail…" />
              </div>
              <Button className="w-full" onClick={saveEdit} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </SidebarProvider>
  );
}
