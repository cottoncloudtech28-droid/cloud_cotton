"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getGstSettings, updateGstSettings, downloadGstr1Csv } from "@/lib/api";
import type { GstSettings } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";
import {
  Receipt, Save, Download, ArrowLeft, Building2, FileText, Info,
} from "lucide-react";

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand",
  "West Bengal","Andaman and Nicobar Islands","Chandigarh","Dadra & Nagar Haveli",
  "Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];

const GST_RATE_INFO = [
  { rate: 0,  label: "0%",  categories: "Essential goods (select items)" },
  { rate: 5,  label: "5%",  categories: "Basic necessity items" },
  { rate: 12, label: "12%", categories: "Stationery, toys, lunch boxes, bottles, return gifts" },
  { rate: 18, label: "18%", categories: "Lamps, speakers, electronics" },
  { rate: 28, label: "28%", categories: "Luxury items" },
];

export default function GstSettingsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<GstSettings>({
    gstin: "", business_name: "", address: "", state: "",
    state_code: "", email: "", phone: "", pan: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) router.push("/");
  }, [user, isAdmin, authLoading, router]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    getGstSettings()
      .then((d) => setForm((f) => ({ ...f, ...d })))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, isAdmin]);

  const set = (k: keyof GstSettings, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.gstin?.trim()) { toast.error("GSTIN is required"); return; }
    setSaving(true);
    try {
      await updateGstSettings(form);
      toast.success("GST settings saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
    setSaving(false);
  };

  const handleExport = () => {
    downloadGstr1Csv(exportFrom || undefined, exportTo || undefined);
    toast.success("Downloading GSTR-1 CSV…");
  };

  if (authLoading || loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <div className="flex-1 p-6 space-y-4">
            <Skeleton className="h-10 w-64 rounded-xl" />
            <Skeleton className="h-64 rounded-3xl" />
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <div className="flex-1 flex flex-col">
          <header className="flex items-center gap-3 px-6 py-4 bg-card border-b border-border">
            <SidebarTrigger />
            <Link href="/admin" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold">GST &amp; Compliance</h1>
            </div>
          </header>

          <main className="flex-1 p-6 space-y-6 max-w-4xl">

            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-sm text-blue-800">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                These details appear on every tax invoice. Your GSTIN, business name, and registered address are
                <strong> legally required</strong> on all invoices issued to customers in India.
              </p>
            </div>

            {/* GST Settings form */}
            <form onSubmit={handleSave}>
              <Card className="p-6 rounded-3xl space-y-5">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h2 className="font-bold text-lg">Business &amp; GST Details</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>GSTIN <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="27AABCU9603R1ZV"
                      value={form.gstin || ""}
                      onChange={(e) => set("gstin", e.target.value.toUpperCase())}
                      className="rounded-xl font-mono"
                      maxLength={15}
                    />
                    <p className="text-xs text-muted-foreground">15-character GST Identification Number</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>PAN</Label>
                    <Input
                      placeholder="AABCU9603R"
                      value={form.pan || ""}
                      onChange={(e) => set("pan", e.target.value.toUpperCase())}
                      className="rounded-xl font-mono"
                      maxLength={10}
                    />
                  </div>
                  <div className="col-span-full space-y-1.5">
                    <Label>Registered Business Name <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="Cotton Cloud Company"
                      value={form.business_name || ""}
                      onChange={(e) => set("business_name", e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="col-span-full space-y-1.5">
                    <Label>Registered Address</Label>
                    <Input
                      placeholder="Shop No. 5, ABC Complex, MG Road"
                      value={form.address || ""}
                      onChange={(e) => set("address", e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>State (for intra/inter-state tax) <span className="text-destructive">*</span></Label>
                    <select
                      value={form.state || ""}
                      onChange={(e) => set("state", e.target.value)}
                      className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select state</option>
                      {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <p className="text-xs text-muted-foreground">Used to determine CGST+SGST vs IGST</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>State Code</Label>
                    <Input
                      placeholder="27"
                      value={form.state_code || ""}
                      onChange={(e) => set("state_code", e.target.value)}
                      className="rounded-xl"
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contact Email</Label>
                    <Input
                      type="email"
                      placeholder="gst@cottoncloud.in"
                      value={form.email || ""}
                      onChange={(e) => set("email", e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contact Phone</Label>
                    <Input
                      placeholder="98765 43210"
                      value={form.phone || ""}
                      onChange={(e) => set("phone", e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-gradient-primary text-primary-foreground border-0 gap-2 px-6"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving…" : "Save GST Settings"}
                </Button>
              </Card>
            </form>

            {/* GST Rate Reference */}
            <Card className="p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="font-bold text-lg">GST Rate Guide</h2>
              </div>
              <p className="text-sm text-muted-foreground">Set these rates on each product in the product manager. Prices shown to customers are GST-inclusive; the breakdown is shown on the invoice.</p>
              <div className="divide-y divide-border">
                {GST_RATE_INFO.map(({ rate, label, categories }) => (
                  <div key={rate} className="flex items-center gap-4 py-3">
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                      rate === 0  ? "bg-green-100 text-green-700" :
                      rate === 5  ? "bg-blue-100 text-blue-700" :
                      rate === 12 ? "bg-amber-100 text-amber-700" :
                      rate === 18 ? "bg-orange-100 text-orange-700" :
                                   "bg-red-100 text-red-700"
                    }`}>{label}</span>
                    <span className="text-sm text-muted-foreground">{categories}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* GSTR-1 Export */}
            <Card className="p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                <h2 className="font-bold text-lg">GSTR-1 Export</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Download a CSV of all non-cancelled orders in GSTR-1 compatible format. Filter by date range (optional) for a specific return period.
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label>From date</Label>
                  <Input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} className="rounded-xl w-44" />
                </div>
                <div className="space-y-1.5">
                  <Label>To date</Label>
                  <Input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} className="rounded-xl w-44" />
                </div>
                <Button
                  onClick={handleExport}
                  className="rounded-full bg-gradient-primary text-primary-foreground border-0 gap-2"
                >
                  <Download className="h-4 w-4" /> Download CSV
                </Button>
              </div>
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3 space-y-1">
                <p className="font-medium">Columns included:</p>
                <p>Invoice No · Invoice Date · Customer Name · Customer GSTIN · Place of Supply · Taxable Value · CGST · SGST · IGST · Total Tax · Invoice Value · Payment Mode</p>
              </div>
            </Card>

          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
