import type { Product, Order, OrderItem, Address, SavedAddress, Category, StockLog } from "./types";

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
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || "Request failed");
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

export async function getProducts(params?: { cat?: string; q?: string; tag?: string }): Promise<Product[]> {
  const qs = new URLSearchParams();
  if (params?.cat && params.cat !== "all") qs.set("cat", params.cat);
  if (params?.q) qs.set("q", params.q);
  if (params?.tag) qs.set("tag", params.tag);
  const query = qs.toString();
  return apiFetch(`/api/products${query ? `?${query}` : ""}`);
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

// ── Orders ───────────────────────────────────────────────────────────────────
export async function getOrders(): Promise<Order[]> {
  return apiFetch("/api/orders");
}

export async function placeOrder(payload: {
  items: OrderItem[];
  address: Address;
  total: number;
}): Promise<Order> {
  return apiFetch("/api/orders", { method: "POST", body: JSON.stringify(payload) });
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

// ── Profile ──────────────────────────────────────────────────────────────────
export async function updateProfile(data: {
  name?: string;
  currentPassword?: string;
  newPassword?: string;
}): Promise<{ id: string; email: string; name: string; role: string }> {
  return apiFetch("/api/auth/me", { method: "PATCH", body: JSON.stringify(data) });
}
