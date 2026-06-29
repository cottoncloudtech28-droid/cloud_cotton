"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getPaymentSettings, updatePaymentSettings } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { toast } from "sonner";
import { CreditCard, ArrowLeft, Truck, Info, Save } from "lucide-react";

export default function PaymentSettingsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [codEnabled, setCodEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) router.push("/");
  }, [user, isAdmin, authLoading, router]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    getPaymentSettings()
      .then((d) => setCodEnabled(d.cod_enabled ?? true))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, isAdmin]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePaymentSettings({ cod_enabled: codEnabled });
      toast.success("Payment settings saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AdminSidebar />
          <div className="flex-1 p-6 space-y-4">
            <Skeleton className="h-10 w-64 rounded-xl" />
            <Skeleton className="h-40 rounded-3xl" />
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
          <header className="flex items-center gap-3 px-6 py-4 bg-card border-b border-border">
            <SidebarTrigger />
            <Link href="/admin" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold">Payment Settings</h1>
            </div>
          </header>

          <main className="flex-1 p-6 space-y-6 max-w-2xl">

            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-sm text-blue-800">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Changes here take effect immediately. Customers will see updated payment options on the checkout page.
              </p>
            </div>

            <Card className="p-6 rounded-3xl space-y-6">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="h-5 w-5 text-primary" />
                <h2 className="font-bold text-lg">Payment Methods</h2>
              </div>

              {/* Razorpay — always on */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <img src="/razorpay.png" alt="Razorpay" height={22} style={{ height: 22, width: "auto" }} />
                  <div>
                    <p className="font-semibold text-sm">Razorpay</p>
                    <p className="text-xs text-muted-foreground">UPI · Cards · Netbanking · Wallets</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                  Always on
                </span>
              </div>

              {/* COD toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-border">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${codEnabled ? "bg-primary/10" : "bg-muted"}`}>
                    <Truck className={`h-5 w-5 ${codEnabled ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <Label htmlFor="cod-toggle" className="font-semibold text-sm cursor-pointer">
                      Cash on Delivery
                    </Label>
                    <p className="text-xs text-muted-foreground">Pay when the order arrives</p>
                  </div>
                </div>
                <Switch
                  id="cod-toggle"
                  checked={codEnabled}
                  onCheckedChange={setCodEnabled}
                />
              </div>

              <div className="pt-1">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-full bg-gradient-primary text-primary-foreground border-0 gap-2 px-6"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving…" : "Save Settings"}
                </Button>
              </div>
            </Card>

          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
