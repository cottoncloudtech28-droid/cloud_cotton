import type {
  Product, Order, OrderItem, Address, SavedAddress, Category, StockLog,
  Supplier, PurchaseOrder, RestockRecommendation, PublicOrderTrack, ShiprocketTracking,
  GstSettings, NotificationSettings,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const TOKEN_KEY = "kcs_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string) { localStorage.setItem(TOKEN_KEY, t); }
export function removeToken() { localStorage.removeItem(TOKEN_KEY); }

export async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    // fetch throws (offline, DNS/timeout, CORS) before any response is received —
    // distinct from the server responding with an error status.
    const netErr = new Error("Network error. Please check your connection and try again.");
    (netErr as any).isNetworkError = true;
    throw netErr;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const httpErr = new Error(err.message || "Request failed");
    (httpErr as any).status = res.status;
    throw httpErr;
  }
  return res.json();
}

export async function uploadFile(file: File | Blob, filename?: string): Promise<{ url: string }> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file, filename);
  const res = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || "Upload failed");
  }
  return res.json();
}

// ── Products ────────────────────────────────────────────────────────────────
export async function getProduct(id: string): Promise<Product> {
  return apiFetch(`/api/products/${id}`);
}

export async function searchSuggestions(q: string, limit = 6): Promise<{
  id: string;
  slug: string | null;
  name: string;
  price: number;
  discount_percent: number;
  image_url: string | null;
  category: string;
  stock: number;
}[]> {
  if (!q.trim()) return [];
  return apiFetch(`/api/products/suggest?q=${encodeURIComponent(q.trim())}&limit=${limit}`);
}

export async function getProducts(params?: {
  cat?: string;
  q?: string;
  tag?: string;
  sort?: string;
  page?: number;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  color?: string;
  size?: string;
  inStock?: boolean;
}): Promise<{ products: Product[]; total: number; page: number; limit: number }> {
  const qs = new URLSearchParams();
  if (params?.cat && params.cat !== "all") qs.set("cat", params.cat);
  if (params?.q) qs.set("q", params.q);
  if (params?.tag) qs.set("tag", params.tag);
  if (params?.sort) qs.set("sort", params.sort);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.minPrice != null) qs.set("minPrice", String(params.minPrice));
  if (params?.maxPrice != null) qs.set("maxPrice", String(params.maxPrice));
  if (params?.color) qs.set("color", params.color);
  if (params?.size) qs.set("size", params.size);
  if (params?.inStock) qs.set("inStock", "true");
  const query = qs.toString();
  return apiFetch(`/api/products${query ? `?${query}` : ""}`);
}

export async function getProductFacets(params?: {
  cat?: string;
  q?: string;
}): Promise<{ priceMin: number; priceMax: number; colors: string[]; sizes: string[] }> {
  const qs = new URLSearchParams();
  if (params?.cat && params.cat !== "all") qs.set("cat", params.cat);
  if (params?.q) qs.set("q", params.q);
  const query = qs.toString();
  return apiFetch(`/api/products/facets${query ? `?${query}` : ""}`);
}

// ── Categories ───────────────────────────────────────────────────────────────
export async function getCategories(): Promise<Category[]> {
  return apiFetch("/api/categories");
}

export async function getCategory(slug: string): Promise<Category> {
  return apiFetch(`/api/categories/${slug}`);
}

export async function updateCategory(slug: string, data: Partial<Omit<Category, "id">>): Promise<Category> {
  return apiFetch(`/api/categories/${slug}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteCategory(slug: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/categories/${slug}`, { method: "DELETE" });
}

export async function reorderCategories(order: { slug: string; sort_order: number }[]): Promise<Category[]> {
  return apiFetch("/api/categories/reorder", { method: "PATCH", body: JSON.stringify({ order }) });
}

export async function setCategoryVisibility(slug: string, is_active: boolean): Promise<Category> {
  return apiFetch(`/api/categories/${slug}/visibility`, { method: "PATCH", body: JSON.stringify({ is_active }) });
}

// ── Orders ───────────────────────────────────────────────────────────────────
export async function getOrders(): Promise<Order[]> {
  return apiFetch("/api/orders");
}

export async function placeOrder(payload: {
  items: OrderItem[];
  address: Address;
  total: number;
  shipping_charge?: number;
}): Promise<Order> {
  return apiFetch("/api/orders", { method: "POST", body: JSON.stringify(payload) });
}

export async function cancelOrder(id: string, reason?: string): Promise<Order> {
  return apiFetch(`/api/orders/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function setOrderTracking(id: string, trackingNumber: string): Promise<Order> {
  return apiFetch(`/api/orders/${id}/tracking`, {
    method: "PATCH",
    body: JSON.stringify({ trackingNumber }),
  });
}

export async function updateOrderStatus(id: string, status: string): Promise<Order> {
  return apiFetch(`/api/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function getAllOrders(): Promise<Order[]> {
  return apiFetch("/api/orders/all");
}

export async function getOrderAnalytics(days = 30): Promise<{
  summary: {
    totalOrders: number;
    totalRevenue: number;
    recentRevenue: number;
    avgOrderValue: number;
    recentOrderCount: number;
    daysNum: number;
  };
  dailyRevenue: { date: string; revenue: number }[];
  byCategory: { name: string; value: number }[];
  topProducts: { name: string; revenue: number; qty: number }[];
  statusCounts: Record<string, number>;
}> {
  return apiFetch(`/api/orders/analytics?days=${days}`);
}

export async function trackOrder(orderId: string): Promise<PublicOrderTrack> {
  return apiFetch(`/api/orders/track/${orderId}`);
}

// ── Payments (Razorpay) ───────────────────────────────────────────────────────
export async function createRazorpayOrder(amount: number): Promise<{
  razorpay_order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}> {
  return apiFetch("/api/orders/razorpay/create-order", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

export async function verifyRazorpayPayment(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  items: OrderItem[];
  address: Address;
  total: number;
  shipping_charge?: number;
}): Promise<Order> {
  return apiFetch("/api/orders/razorpay/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ── Wishlist ─────────────────────────────────────────────────────────────────
export async function getWishlist(): Promise<Product[]> {
  return apiFetch("/api/users/wishlist");
}

export async function getWishlistIds(): Promise<string[]> {
  return apiFetch("/api/users/wishlist/ids");
}

export async function addToWishlist(productId: string): Promise<{ ok: boolean; count: number }> {
  return apiFetch(`/api/users/wishlist/${productId}`, { method: "POST" });
}

export async function removeFromWishlist(productId: string): Promise<{ ok: boolean; count: number }> {
  return apiFetch(`/api/users/wishlist/${productId}`, { method: "DELETE" });
}

// ── Inventory ────────────────────────────────────────────────────────────────
export async function getLowStockProducts(): Promise<Product[]> {
  return apiFetch("/api/products/low-stock");
}

export async function adjustStock(
  productId: string,
  data: { stock: number; size?: string; note?: string; reason?: string }
): Promise<Product> {
  return apiFetch(`/api/products/${productId}/stock`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function bulkUpdateStock(
  updates: { id: string; stock: number; note?: string }[]
): Promise<{ updated: number; products: Product[] }> {
  return apiFetch("/api/products/bulk-stock", {
    method: "PATCH",
    body: JSON.stringify({ updates }),
  });
}

export async function bulkDeleteProducts(ids: string[]): Promise<{ deleted: number }> {
  return apiFetch("/api/products/bulk", { method: "DELETE", body: JSON.stringify({ ids }) });
}

export async function bulkEditProducts(
  ids: string[],
  updates: { category?: string; is_active?: boolean; price?: number; discount_percent?: number; stock?: number }
): Promise<{ updated: number; products: Product[] }> {
  return apiFetch("/api/products/bulk", { method: "PATCH", body: JSON.stringify({ ids, updates }) });
}

export async function getStockLogs(params?: {
  productId?: string;
  reason?: string;
  limit?: number;
  page?: number;
}): Promise<{ logs: StockLog[]; total: number; page: number; limit: number }> {
  const qs = new URLSearchParams();
  if (params?.productId) qs.set("productId", params.productId);
  if (params?.reason) qs.set("reason", params.reason);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.page) qs.set("page", String(params.page));
  const q = qs.toString();
  return apiFetch(`/api/stocklogs${q ? `?${q}` : ""}`);
}

export async function updateReorderPoint(
  productId: string,
  reorder_point: number
): Promise<Product> {
  return apiFetch(`/api/products/${productId}`, {
    method: "PUT",
    body: JSON.stringify({ reorder_point }),
  });
}

// ── Addresses ────────────────────────────────────────────────────────────────
export async function getSavedAddresses(): Promise<SavedAddress[]> {
  return apiFetch("/api/users/addresses");
}

export async function addSavedAddress(data: Address & { label?: string; isDefault?: boolean }): Promise<SavedAddress[]> {
  return apiFetch("/api/users/addresses", { method: "POST", body: JSON.stringify(data) });
}

export async function updateSavedAddress(id: string, data: Partial<Address & { label?: string; isDefault?: boolean }>): Promise<SavedAddress[]> {
  return apiFetch(`/api/users/addresses/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteSavedAddress(id: string): Promise<SavedAddress[]> {
  return apiFetch(`/api/users/addresses/${id}`, { method: "DELETE" });
}

export async function setDefaultAddress(id: string): Promise<SavedAddress[]> {
  return apiFetch(`/api/users/addresses/${id}/default`, { method: "PATCH" });
}

// ── Restock Recommendations ───────────────────────────────────────────────────
export async function getRestockRecommendations(): Promise<RestockRecommendation[]> {
  return apiFetch("/api/products/restock-recommendations");
}

// ── Suppliers ─────────────────────────────────────────────────────────────────
export async function getSuppliers(): Promise<Supplier[]> {
  return apiFetch("/api/suppliers");
}

export async function createSupplier(data: Omit<Supplier, "id" | "createdAt">): Promise<Supplier> {
  return apiFetch("/api/suppliers", { method: "POST", body: JSON.stringify(data) });
}

export async function updateSupplier(id: string, data: Partial<Omit<Supplier, "id" | "createdAt">>): Promise<Supplier> {
  return apiFetch(`/api/suppliers/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteSupplier(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/suppliers/${id}`, { method: "DELETE" });
}

// ── Purchase Orders ───────────────────────────────────────────────────────────
export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  return apiFetch("/api/purchase-orders");
}

export async function createPurchaseOrder(data: {
  supplier: string;
  items: { product: string; productName: string; sku?: string | null; size?: string | null; quantity: number; unitCost: number }[];
  expectedDelivery?: string | null;
  notes?: string | null;
}): Promise<PurchaseOrder> {
  return apiFetch("/api/purchase-orders", { method: "POST", body: JSON.stringify(data) });
}

export async function updatePurchaseOrder(id: string, data: Partial<{
  supplier: string;
  items: any[];
  expectedDelivery: string | null;
  notes: string | null;
}>): Promise<PurchaseOrder> {
  return apiFetch(`/api/purchase-orders/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function updatePOStatus(id: string, status: string): Promise<PurchaseOrder> {
  return apiFetch(`/api/purchase-orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
}

export async function deletePurchaseOrder(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/purchase-orders/${id}`, { method: "DELETE" });
}

// ── Admin: Customers ──────────────────────────────────────────────────────────
export async function getAdminCustomers(params?: {
  q?: string;
  page?: number;
  limit?: number;
}): Promise<{
  customers: {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: string;
    orderCount: number;
    totalSpent: number;
    lastOrderAt: string | null;
  }[];
  total: number;
  page: number;
  limit: number;
}> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const q = qs.toString();
  return apiFetch(`/api/users/admin/all${q ? `?${q}` : ""}`);
}

export async function updateCustomerRole(id: string, role: "customer" | "admin"): Promise<{
  id: string; email: string; name: string; role: string;
}> {
  return apiFetch(`/api/users/admin/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
}

// ── Shiprocket ────────────────────────────────────────────────────────────────
export type CourierOption = {
  courier_id: number | null;
  courier_name: string | null;
  freight_charge: number;
  cod_charge: number;
  total_charge: number;
  estimated_days: number | null;
  etd: string | null;          // "YYYY-MM-DD"
  is_recommended: boolean;
  rating: number | null;
};

export type ShippingRateResult = {
  serviceable: boolean;
  free_shipping?: boolean;
  pickup_pincode?: string;
  recommended: CourierOption | null;
  cheapest?: CourierOption | null;
  fastest?: CourierOption | null;
  options: CourierOption[];
  fallback?: boolean;
  error?: string;
};

export async function getShippingRate(pincode: string, weightKg = 0.5, isCod = false): Promise<ShippingRateResult> {
  const params = new URLSearchParams({ pincode, weight: String(weightKg), cod: isCod ? "1" : "0" });
  return apiFetch(`/api/shiprocket/shipping-rate?${params}`);
}

export async function pushToShiprocket(orderId: string): Promise<Order> {
  return apiFetch(`/api/shiprocket/push/${orderId}`, { method: "POST" });
}

export async function getShiprocketTracking(awb: string): Promise<{ tracking_data: ShiprocketTracking }> {
  return apiFetch(`/api/shiprocket/track/${awb}`);
}

export async function getShiprocketTrackingPublic(orderId: string): Promise<{ tracking_data: ShiprocketTracking }> {
  return apiFetch(`/api/shiprocket/track-public/${orderId}`);
}

// ── Profile ──────────────────────────────────────────────────────────────────
export async function updateProfile(data: {
  name?: string;
  currentPassword?: string;
  newPassword?: string;
}): Promise<{ id: string; email: string; name: string; role: string }> {
  return apiFetch("/api/auth/me", { method: "PATCH", body: JSON.stringify(data) });
}

// ── GST / Settings ────────────────────────────────────────────────────────────
export async function getGstSettings(): Promise<GstSettings> {
  return apiFetch("/api/settings/gst");
}

export async function updateGstSettings(data: GstSettings): Promise<GstSettings> {
  return apiFetch("/api/settings/gst", { method: "PUT", body: JSON.stringify(data) });
}

export interface PaymentSettings {
  cod_enabled: boolean;
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  return apiFetch("/api/settings/payment");
}

export async function updatePaymentSettings(data: PaymentSettings): Promise<PaymentSettings> {
  return apiFetch("/api/settings/payment", { method: "PUT", body: JSON.stringify(data) });
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  return apiFetch("/api/settings/notifications");
}

export async function updateNotificationSettings(data: NotificationSettings): Promise<NotificationSettings> {
  return apiFetch("/api/settings/notifications", { method: "PUT", body: JSON.stringify(data) });
}

export async function sendTestNotificationEmail(email: string): Promise<{ ok: boolean }> {
  return apiFetch("/api/settings/notifications/test", { method: "POST", body: JSON.stringify({ email }) });
}

export async function getOrderInvoice(orderId: string): Promise<{ order: Order; gstSettings: GstSettings }> {
  return apiFetch(`/api/orders/${orderId}/invoice`);
}

export function downloadGstr1Csv(from?: string, to?: string): void {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to)   params.set("to", to);
  const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/orders/admin/gstr1-export?${params}`;
  const a = document.createElement("a");
  a.href = url;
  a.download = `GSTR1_${Date.now()}.csv`;
  // attach token via fetch+blob since we need auth header
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => r.blob())
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      a.href = blobUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    });
}

