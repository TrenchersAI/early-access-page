import { NextResponse, type NextRequest } from "next/server";

/** Paths that must never be treated as referral codes — both real Next.js
   routes and well-known assets/endpoints. Keep this in sync as the app grows. */
const RESERVED_SEGMENTS = new Set([
  "",
  "api",
  "privacy",
  "terms",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

/** Match the same shape Prisma's cuid()-derived referral codes use:
   alphanumeric, 6–12 lowercase chars/digits. Tightening this prevents
   /aboutus or /dashboard typos from being misinterpreted as ref codes. */
const REF_CODE_PATTERN = /^[a-z0-9]{6,12}$/;

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const segment = pathname.slice(1).split("/")[0];

  if (RESERVED_SEGMENTS.has(segment)) return NextResponse.next();
  if (!REF_CODE_PATTERN.test(segment)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("ref", segment);
  return NextResponse.rewrite(url);
}

export const config = {
  /** Skip Next internals, API routes, and any path with a file extension
     (images, fonts, etc.) so the middleware only inspects "page-shaped" URLs. */
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
