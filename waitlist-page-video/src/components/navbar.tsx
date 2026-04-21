"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";

export default function Navbar() {
  return (
    <motion.header
      className="sticky top-0 z-20 shrink-0 bg-black/70 backdrop-blur-xs"
      initial={{ opacity: 0, y: -20, filter: "blur(14px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{
        duration: 0.55,
        delay: 0.08,
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
        <ul className="flex items-center gap-6 text-sm text-white/85">
          <li>
            <Link href="/" className="transition hover:text-white">
              Invite code
            </Link>
          </li>
          <li className="hidden sm:list-item">
            <Link href="#join" className="transition hover:text-white">
              Early access
            </Link>
          </li>
        </ul>
      </nav>
    </motion.header>
  );
}
