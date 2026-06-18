"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/shop/Navbar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";
import { getOrderAnalytics } from "@/lib/api";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { TrendingUp, ShoppingBag, IndianRupee, RefreshCw } from "lucide-react";

const DAYS_OPTIONS = [7, 14, 30, 90] as const;
type Days = typeof DAYS_OPTIONS[number];

const COLORS = ["#ec4899", "#a855f7", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#14b8a6", "#6366f1"];

function StatCard({ label, value, sub, Icon }: {
  label: string;
  value: string;
  sub?: string;
  Icon: React.ElementType;
}) {
  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function AnalyticsPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [days, setDays] = useState<Days>(30);
  const [data, setData] = useState<Awaited<ReturnType<typeof getOrderAnalytics>> | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) router.push(`/auth?redirect=${encodeURIComponent("/admin/analytics")}`);
  }, [user, loading, router]);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setFetching(true);
    try {
      const result = await getOrderAnalytics(days);
      setData(result);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setFetching(false);
    }
  }, [isAdmin, days]);

  useEffect(() => { load(); }, [load]);

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
            <span className="ml-2 text-sm text-muted-foreground">Admin / Analytics</span>
          </div>
          <main className="container py-8 space-y-8">

            {/* Header */}
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-4xl font-bold">Sales Analytics</h1>
                <p className="text-muted-foreground mt-1">Revenue and order insights</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-full border border-border overflow-hidden">
                  {DAYS_OPTIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                        days === d ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
                <Button variant="outline" size="icon" onClick={load} disabled={fetching}>
                  <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {fetching || !data ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
                <Skeleton className="h-72 rounded-xl" />
                <div className="grid md:grid-cols-2 gap-6">
                  <Skeleton className="h-64 rounded-xl" />
                  <Skeleton className="h-64 rounded-xl" />
                </div>
              </div>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard
                    label={`Revenue (last ${days}d)`}
                    value={fmt(data.summary.recentRevenue)}
                    sub={`${data.summary.recentOrderCount} orders`}
                    Icon={IndianRupee}
                  />
                  <StatCard
                    label="Total revenue (all time)"
                    value={fmt(data.summary.totalRevenue)}
                    sub={`${data.summary.totalOrders} orders total`}
                    Icon={TrendingUp}
                  />
                  <StatCard
                    label="Avg order value"
                    value={fmt(data.summary.avgOrderValue)}
                    Icon={ShoppingBag}
                  />
                  <StatCard
                    label="Pending orders"
                    value={String(data.statusCounts["pending"] ?? 0)}
                    sub={`${data.statusCounts["shipped"] ?? 0} shipped`}
                    Icon={ShoppingBag}
                  />
                </div>

                {/* Daily revenue line chart */}
                <Card className="p-6">
                  <h2 className="text-lg font-bold mb-4">Daily Revenue — last {days} days</h2>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={data.dailyRevenue} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v: string) => {
                          const d = new Date(v);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                        interval={days <= 14 ? 0 : Math.floor(days / 10)}
                      />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} />
                      <Tooltip
                        formatter={(v: number) => [fmt(v), "Revenue"]}
                        labelFormatter={(l: string) => new Date(l).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="#ec4899" strokeWidth={2} dot={days <= 14} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>

                {/* Bottom charts */}
                <div className="grid md:grid-cols-2 gap-6">

                  {/* Category breakdown pie */}
                  <Card className="p-6">
                    <h2 className="text-lg font-bold mb-4">Revenue by category</h2>
                    {data.byCategory.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No data yet</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie
                            data={data.byCategory}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            label={({ name, percent }: { name: string; percent: number }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                            labelLine={false}
                          >
                            {data.byCategory.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => fmt(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </Card>

                  {/* Top products bar chart */}
                  <Card className="p-6">
                    <h2 className="text-lg font-bold mb-4">Top 10 products by revenue</h2>
                    {data.topProducts.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No data yet</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart
                          data={data.topProducts}
                          layout="vertical"
                          margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 10 }}
                            width={120}
                            tickFormatter={(v: string) => v.length > 16 ? `${v.slice(0, 15)}…` : v}
                          />
                          <Tooltip formatter={(v: number) => [fmt(v), "Revenue"]} />
                          <Bar dataKey="revenue" fill="#a855f7" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </Card>
                </div>

                {/* Order status table */}
                <Card className="p-6">
                  <h2 className="text-lg font-bold mb-4">All-time order status breakdown</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {(["pending", "confirmed", "shipped", "delivered", "cancelled"] as const).map((s) => (
                      <div key={s} className="text-center p-3 rounded-xl bg-muted">
                        <p className="text-2xl font-bold">{data.statusCounts[s] ?? 0}</p>
                        <p className="text-xs text-muted-foreground capitalize mt-0.5">{s}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
