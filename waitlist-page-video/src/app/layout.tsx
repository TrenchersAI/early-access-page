import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://www.trenchers.ai";
const SITE_TITLE = "Trenchers AI — Copy Whales, Snipe Tokens, Trade Faster";
const SITE_DESCRIPTION =
  "Snipe new launches, track onchain activity, and join the Trenchers AI waitlist for early access.";

export const metadata: Metadata = {
  /** Resolves relative image paths in Open Graph / Twitter metadata to
     absolute URLs — required for social-platform crawlers. */
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Trenchers AI",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-image.jpg",
        width: 1803,
        height: 2025,
        alt: "Trenchers AI — AI agents faster than your reflexes",
      },
    ],
  },
  twitter: {
    /** Twitter prefers ~2:1; serve a dedicated 1200x630 crop while every
       other platform (Discord, Telegram, iMessage) gets the full banner. */
    card: "summary_large_image",
    site: "@TrenchersAI",
    creator: "@TrenchersAI",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-twitter.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col bg-black text-white">
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
