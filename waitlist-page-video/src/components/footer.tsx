"use client";

import Link from "next/link";
import { motion } from "motion/react";

export default function Footer() {
  return (
    <motion.footer
      className="relative z-20 shrink-0 bg-black/70 backdrop-blur-xs"
      initial={{ opacity: 0, y: 24, filter: "blur(14px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{
        duration: 0.55,
        delay: 0.72,
        ease: [0.22, 1, 0.36, 1] as const,
      }}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 text-center sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-left">
        <p className="text-sm text-white/55">
          © {new Date().getFullYear()} TrenchersAI. All rights reserved.
        </p>
        <ul className="flex flex-wrap items-center gap-6 text-sm text-white/75">
          <li>
            <Link href="#" className="transition hover:text-white">
              Terms
            </Link>
          </li>
          <li>
            <Link href="#" className="transition hover:text-white">
              Privacy
            </Link>
          </li>
          <li>
            <a
              href="https://www.linkedin.com/company/trenchersai/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-white"
              aria-label="TrenchersAI on LinkedIn"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </li>
          <li>
            <a
              href="https://x.com/TrenchersAI"
              className="transition hover:text-white"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TrenchersAI on X"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M18.9 2H22.3L14.9 10.5L23.7 22H16.8L11.4 14.9L5.2 22H1.8L9.7 12.9L1.3 2H8.4L13.3 8.5L18.9 2ZM17.7 19.9H19.6L7.4 4H5.4L17.7 19.9Z" />
              </svg>
            </a>
          </li>
        </ul>
      </div>
    </motion.footer>
  );
}
