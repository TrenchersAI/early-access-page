"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

type NavbarProps = {
  isVerified?: boolean;
};

export default function Navbar({ isVerified = false }: NavbarProps) {
  const prefersReducedMotion = useReducedMotion();
  const skipMotion = isVerified || prefersReducedMotion;
  const initial = skipMotion
    ? false
    : { opacity: 0, y: -20, filter: "blur(14px)" };
  const statusLabel = isVerified ? "Sniped" : "Snipe It";

  return (
    <motion.header
      /* Safe-area top/left/right keep the navbar content clear of the iPhone
         notch and rounded corners now that viewportFit:"cover" is set. */
      className="sticky top-0 z-20 shrink-0 bg-black/70 backdrop-blur-xs pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
      initial={initial}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{
        duration: skipMotion ? 0 : 0.55,
        delay: skipMotion ? 0 : 0.08,
        ease: [0.22, 1, 0.36, 1] as const,
      }}
    >
      <nav
        className="mx-auto flex h-24 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6"
        aria-label="Main"
      >
        <Link href="/" className="flex shrink-0 items-center" aria-label="Home">
          <Image
            src="/logo.svg"
            alt=""
            width={220}
            height={78}
            className="h-6 w-auto sm:h-8 md:h-8"
            priority
          />
        </Link>
        <div className="flex shrink-0 items-center gap-5 text-sm text-white/85">
          <span>Early access</span>
          <span className="hidden sm:inline">{statusLabel}</span>
        </div>
      </nav>
    </motion.header>
  );
}
