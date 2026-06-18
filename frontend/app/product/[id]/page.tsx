import type { Metadata } from "next";
import ProductDetailClient from "./ProductDetailClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  try {
    const res = await fetch(`${API_URL}/api/products/${params.id}`, { next: { revalidate: 3600 } });
    if (!res.ok) return {};
    const p = await res.json();
    const title = p.name;
    const description = p.short_description || p.description?.slice(0, 160) || `Shop ${p.name} at Cotton Cloud Company`;
    const image = p.images?.[0] ?? p.image_url ?? undefined;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: image ? [{ url: image, width: 800, height: 800, alt: p.name }] : [],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: image ? [image] : [],
      },
    };
  } catch {
    return {};
  }
}

export default function ProductDetailPage() {
  return <ProductDetailClient />;
}
