// Thin wrapper around window.fbq (Meta Pixel). Safe to call before the pixel
// script has loaded or on the server — every call is a no-op in that case.
declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

function fbq(...args: any[]) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq(...args);
  }
}

export function pixelPageview() {
  fbq("track", "PageView");
}

export function pixelViewContent(params: { id: string; name: string; price: number; category?: string }) {
  fbq("track", "ViewContent", {
    content_ids: [params.id],
    content_name: params.name,
    content_type: "product",
    content_category: params.category,
    value: params.price,
    currency: "INR",
  });
}

export function pixelAddToCart(params: { id: string; name: string; price: number; quantity: number; category?: string }) {
  fbq("track", "AddToCart", {
    content_ids: [params.id],
    content_name: params.name,
    content_type: "product",
    content_category: params.category,
    value: params.price * params.quantity,
    currency: "INR",
    contents: [{ id: params.id, quantity: params.quantity }],
  });
}

export function pixelInitiateCheckout(params: { value: number; itemCount: number; ids: string[] }) {
  fbq("track", "InitiateCheckout", {
    content_ids: params.ids,
    content_type: "product",
    num_items: params.itemCount,
    value: params.value,
    currency: "INR",
  });
}

export function pixelPurchase(params: { orderId: string; value: number; ids: string[] }) {
  fbq("track", "Purchase", {
    content_ids: params.ids,
    content_type: "product",
    value: params.value,
    currency: "INR",
  }, { eventID: params.orderId }); // eventID lets Conversions API dedupe against this browser-side event
}
