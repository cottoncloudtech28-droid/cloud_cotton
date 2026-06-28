"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Upload, LayoutGrid, BarChart2, Truck, ShoppingCart, ClipboardList, TrendingUp, Users, Receipt, Star } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Analytics", url: "/admin/analytics", icon: TrendingUp },
  { title: "Products", url: "/admin", icon: Package },
  { title: "Inventory", url: "/admin/inventory", icon: BarChart2 },
  { title: "Orders", url: "/admin/orders", icon: ClipboardList },
  { title: "Customers", url: "/admin/customers", icon: Users },
  { title: "Bulk Upload", url: "/admin/bulk", icon: Upload },
  { title: "Categories", url: "/admin/categories", icon: LayoutGrid },
  { title: "Suppliers", url: "/admin/suppliers", icon: Truck },
  { title: "Purchase Orders", url: "/admin/purchase-orders", icon: ShoppingCart },
  { title: "GST & Compliance", url: "/admin/gst", icon: Receipt },
  { title: "Reviews", url: "/admin/reviews", icon: Star },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link href={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
