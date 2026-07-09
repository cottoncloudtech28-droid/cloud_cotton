"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getNotificationSettings, updateNotificationSettings, sendTestNotificationEmail } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { toast } from "sonner";
import { Mail, ArrowLeft, Info, Save, Send, ShoppingBag, Bell } from "lucide-react";

export default function NotificationSettingsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orderConfirmationEnabled, setOrderConfirmationEnabled] = useState(true);
  const [adminAlertEnabled, setAdminAlertEnabled] = useState(true);
  const [adminEmail, setAdminEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) router.push("/");
  }, [user, isAdmin, authLoading, router]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    getNotificationSettings()
      .then((d) => {
        setOrderConfirmationEnabled(d.order_confirmation_enabled ?? true);
        setAdminAlertEnabled(d.admin_alert_enabled ?? true);
        setAdminEmail(d.admin_email || "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, isAdmin]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateNotificationSettings({
        order_confirmation_enabled: orderConfirmationEnabled,
        admin_alert_enabled: adminAlertEnabled,
        admin_email: adminEmail.trim(),
      });
      toast.success("Notification settings saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!adminEmail.trim()) { toast.error("Enter an admin email first"); return; }
    setTesting(true);
    try {
      await sendTestNotificationEmail(adminEmail.trim());
      toast.success(`Test email sent to ${adminEmail.trim()}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send test email");
    } finally {
      setTesting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AdminSidebar />
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
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="flex items-center gap-3 px-6 py-4 bg-card border-b border-border">
            <SidebarTrigger />
            <Link href="/admin" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold">Order Email Notifications</h1>
            </div>
          </header>

          <main className="flex-1 p-6 space-y-6 max-w-2xl">

            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-sm text-blue-800">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                These emails are sent automatically every time a customer places an order (COD or online payment).
                Changes here take effect immediately for the next order.
              </p>
            </div>

            <Card className="p-6 rounded-3xl space-y-6">
              <div className="flex items-center gap-2 mb-1">
                <Bell className="h-5 w-5 text-primary" />
                <h2 className="font-bold text-lg">Email Triggers</h2>
              </div>

              {/* Customer confirmation toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-border">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${orderConfirmationEnabled ? "bg-primary/10" : "bg-muted"}`}>
                    <ShoppingBag className={`h-5 w-5 ${orderConfirmationEnabled ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <Label htmlFor="confirm-toggle" className="font-semibold text-sm cursor-pointer">
                      Customer order confirmation
                    </Label>
                    <p className="text-xs text-muted-foreground">Emails the customer a receipt + tracking link when they place an order</p>
                  </div>
                </div>
                <Switch id="confirm-toggle" checked={orderConfirmationEnabled} onCheckedChange={setOrderConfirmationEnabled} />
              </div>

              {/* Admin alert toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-border">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${adminAlertEnabled ? "bg-primary/10" : "bg-muted"}`}>
                    <Bell className={`h-5 w-5 ${adminAlertEnabled ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <Label htmlFor="admin-toggle" className="font-semibold text-sm cursor-pointer">
                      Admin new-order alert
                    </Label>
                    <p className="text-xs text-muted-foreground">Emails the address below whenever a new order comes in</p>
                  </div>
                </div>
                <Switch id="admin-toggle" checked={adminAlertEnabled} onCheckedChange={setAdminAlertEnabled} />
              </div>

              <div className="space-y-1.5">
                <Label>Admin notification email</Label>
                <Input
                  type="email"
                  placeholder="orders@cottoncloudcompany.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="rounded-xl"
                />
                <p className="text-xs text-muted-foreground">Where new-order alerts are sent. Defaults to the store's contact email if left blank.</p>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <Button onClick={handleSave} disabled={saving} className="rounded-full bg-gradient-primary text-primary-foreground border-0 gap-2 px-6">
                  <Save className="h-4 w-4" />
                  {saving ? "Saving…" : "Save Settings"}
                </Button>
                <Button onClick={handleTest} disabled={testing} variant="outline" className="rounded-full gap-2 px-6">
                  <Send className="h-4 w-4" />
                  {testing ? "Sending…" : "Send test email"}
                </Button>
              </div>
            </Card>

          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
