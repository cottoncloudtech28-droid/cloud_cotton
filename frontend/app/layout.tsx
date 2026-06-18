import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "Cotton Cloud Company — Kawaii Stationery & Gifts",
    template: "%s — Cotton Cloud Company",
  },
  description: "Shop adorable kawaii stationery, plushies, gifts, and lifestyle products. India's cutest online kawaii store.",
  keywords: ["kawaii", "cute stationery", "kawaii gifts", "plushies", "anime stationery", "india kawaii shop"],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://cloud-cotton.vercel.app"),
  openGraph: {
    siteName: "Cotton Cloud Company",
    type: "website",
    locale: "en_IN",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Cotton Cloud Company" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@cottoncloudcompany",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&family=Quicksand:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
