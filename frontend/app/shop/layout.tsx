import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse all kawaii stationery, plushies, gifts, and lifestyle products. Filter by category, sort by price, and find your next adorable treasure.",
  openGraph: {
    title: "Shop — Cotton Cloud Company",
    description: "Browse all kawaii stationery, plushies, gifts, and lifestyle products.",
    type: "website",
  },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
