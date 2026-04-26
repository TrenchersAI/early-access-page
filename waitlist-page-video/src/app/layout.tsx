import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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

/** X (Twitter) Pixel base code from ads.x.com → Tools → Conversion Tracking.
   Loaded as an `afterInteractive` script so it doesn't block first paint.
   Only emitted when `NEXT_PUBLIC_X_PIXEL_ID` is set, so preview/local
   builds without the env var ship no third-party JS. */
const X_PIXEL_ID = process.env.NEXT_PUBLIC_X_PIXEL_ID;

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
        {X_PIXEL_ID && (
          <Script id="x-pixel-base" strategy="afterInteractive">
            {`!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
twq('config','${X_PIXEL_ID}');`}
          </Script>
        )}
      </body>
    </html>
  );
}
