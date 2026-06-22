export interface ProductSize {
  label: string;
  stock: number;
}

export interface Product {
  id: string;
  slug?: string | null;
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

export type StockLogReason = "order" | "manual_adjust" | "bulk_update" | "restock" | "correction" | "cancellation" | "return";

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
// ── Supplier ──────────────────────────────────────────────────────────────────
export interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

// ── Purchase Order ────────────────────────────────────────────────────────────
export interface PurchaseOrderItem {
  product: string;
  productName: string;
  sku: string | null;
  size: string | null;
  quantity: number;
  unitCost: number;
}

export type POStatus = "draft" | "sent" | "received" | "cancelled";

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: { id: string; name: string } | string;
  items: PurchaseOrderItem[];
  status: POStatus;
  expectedDelivery: string | null;
  totalCost: number;
  notes: string | null;
  receivedAt: string | null;
  createdAt: string;
}

// ── Restock Recommendation ────────────────────────────────────────────────────
export interface RestockRecommendation {
  id: string;
  name: string;
  sku: string | null;
  image_url: string | null;
  currentStock: number;
  reorderPoint: number;
  sold30d: number;
  dailyRate: number;
  daysRemaining: number | null;
  urgency: "critical" | "warning";
  recommendedQty: number;
}

export type PaymentMethod = "razorpay" | "cod";
export type PaymentStatus = "pending" | "paid" | "failed";

export interface Order {
  id: string;
  orderId: string;
  items: OrderItem[];
  address: Address;
  total: number;
  status: OrderStatus;
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  trackingNumber?: string | null;
  shiprocket_order_id?: string | null;
  shiprocket_shipment_id?: string | null;
  awb_code?: string | null;
  courier_name?: string | null;
  cancelledBy?: "customer" | "admin" | null;
  cancelReason?: string | null;
  user?: { id: string; email: string; name: string } | string;
  createdAt: string;
  updatedAt?: string;
}

export interface ShiprocketTrackActivity {
  date: string;
  status: string;
  activity: string;
  location: string;
}

export interface ShiprocketTracking {
  awb_code?: string;
  courier_name?: string;
  current_status?: string;
  shipment_track_activities?: ShiprocketTrackActivity[];
}

export interface PublicOrderTrack {
  orderId: string;
  status: OrderStatus;
  trackingNumber: string | null;
  cancelReason: string | null;
  payment_method: PaymentMethod;
  createdAt: string;
  updatedAt: string;
  address: { city: string; state: string; pincode: string };
  items: { name: string; image_url: string | null; qty: number; size: string | null; color: string | null }[];
}
