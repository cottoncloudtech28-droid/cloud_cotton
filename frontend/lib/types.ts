export interface ProductSize {
  label: string;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  short_description: string | null;
  description: string | null;
  price: number;
  discount_percent: number;
  image_url: string | null;
  images: string[];
  category: string;
  stock: number;
  is_active?: boolean;
  colors?: string[] | null;
  tags?: string[];
  sizes?: ProductSize[];
  sku?: string;
  reorder_point?: number;
  createdAt?: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  banner_url: string | null;
  emoji: string;
  sort_order: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  image_url: string | null;
  price: number;
  discount_percent: number;
  qty: number;
  color: string | null;
  size: string | null;
}

export type StockLogReason = "order" | "manual_adjust" | "bulk_update" | "restock" | "correction";

export interface StockLog {
  id: string;
  product: { id: string; name: string; sku: string | null } | string;
  productName: string;
  sku: string | null;
  size: string | null;
  change: number;
  stockBefore: number;
  stockAfter: number;
  reason: StockLogReason;
  orderId: string | null;
  note: string | null;
  createdAt: string;
}

export interface Address {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface SavedAddress extends Address {
  id: string;
  label: string;
  isDefault: boolean;
}

export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

export interface Order {
  id: string;
  orderId: string;
  items: OrderItem[];
  address: Address;
  total: number;
  status: OrderStatus;
  createdAt: string;
}
