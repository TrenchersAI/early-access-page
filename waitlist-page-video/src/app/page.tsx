"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { motion } from "motion/react";
import Footer from "../components/footer";
import Navbar from "../components/navbar";
import AiIcon from "../icons/ai-icon";
import CopyIcon from "../icons/copy-icon";
import SnipeIcon from "../icons/snipe-icon";
import TrackingIcon from "../icons/tracking-icon";

/** Show navbar, overlay, and footer this many seconds before playback ends */
const REVEAL_BEFORE_END_SEC = 2;

const contentContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.22,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 22, filter: "blur(14px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const FEATURE_STRIP_ITEMS = [
  { label: "Snipe New Launches", icon: <SnipeIcon /> },
  { label: "AI Trading Agents", icon: <AiIcon /> },
  { label: "Live Onchain Tracking", icon: <TrackingIcon /> },
  { label: "Copy Whales Trades", icon: <CopyIcon /> },
];

export default function Home() {
  const [revealUi, setRevealUi] = useState(false);
  const [showPlayFallback, setShowPlayFallback] = useState(false);
  const [email, setEmail] = useState("");
  const [submitState, setSubmitState] = useState<{
    loading: boolean;
    message: string;
    error: boolean;
  }>({
    loading: false,
    message: "",
    error: false,
  });
  const revealAppliedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const requestVideoPlay = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return false;

    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    v.playsInline = true;

    try {
      await v.play();
      setShowPlayFallback(false);
      return true;
    } catch {
      if (v.paused) setShowPlayFallback(true);
      return false;
    }
  }, []);

  /** Mobile Safari often ignores the autoplay attribute; muted + programmatic play() is required. */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    v.playsInline = true;

    const tryPlay = () => {
      void requestVideoPlay();
    };

    const onPlaying = () => setShowPlayFallback(false);
    const onPause = () => {
      if (!revealAppliedRef.current && document.visibilityState === "visible") {
        setShowPlayFallback(true);
      }
    };

    tryPlay();
    v.addEventListener("loadedmetadata", tryPlay);
    v.addEventListener("loadeddata", tryPlay);
    v.addEventListener("canplay", tryPlay);
    v.addEventListener("canplaythrough", tryPlay);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("pause", onPause);

    const t = window.setTimeout(tryPlay, 100);
    const fallbackT = window.setTimeout(() => {
      if (v.paused && !revealAppliedRef.current) setShowPlayFallback(true);
    }, 1200);

    /** iOS can block autoplay until the first user gesture; one tap starts playback. */
    const onFirstInteraction = () => {
      if (!revealAppliedRef.current) {
        tryPlay();
      }
      document.removeEventListener("touchend", onFirstInteraction);
      document.removeEventListener("click", onFirstInteraction);
    };
    document.addEventListener("touchend", onFirstInteraction, {
      passive: true,
    });
    document.addEventListener("click", onFirstInteraction);

    return () => {
      window.clearTimeout(t);
      window.clearTimeout(fallbackT);
      v.removeEventListener("loadedmetadata", tryPlay);
      v.removeEventListener("loadeddata", tryPlay);
      v.removeEventListener("canplay", tryPlay);
      v.removeEventListener("canplaythrough", tryPlay);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("pause", onPause);
      document.removeEventListener("touchend", onFirstInteraction);
      document.removeEventListener("click", onFirstInteraction);
    };
  }, [requestVideoPlay]);

  const maybeRevealBeforeEnd = useCallback((video: HTMLVideoElement) => {
    if (revealAppliedRef.current) return;
    const { duration, currentTime } = video;
    if (!Number.isFinite(duration) || duration <= 0) return;
    if (currentTime >= duration - REVEAL_BEFORE_END_SEC) {
      revealAppliedRef.current = true;
      setRevealUi(true);
    }
  }, []);

  const handleWaitlistSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      setSubmitState({
        loading: false,
        message: "Please enter your email.",
        error: true,
      });
      return;
    }

    setSubmitState({ loading: true, message: "", error: false });

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as { message?: string };
      const message = data.message ?? "Request completed.";

      if (!response.ok) {
        setSubmitState({
          loading: false,
          message,
          error: true,
        });
        return;
      }

      setSubmitState({
        loading: false,
        message,
        error: false,
      });
      setEmail("");
    } catch {
      setSubmitState({
        loading: false,
        message: "Unable to submit right now. Please try again.",
        error: true,
      });
    }
  };

  return (
    <div className="flex min-h-dvh w-full flex-1 flex-col">
      {/* Fixed layer: avoid flex/transform ancestors; object-center so crop stays stable */}
      <video
        ref={videoRef}
        className="bg-video"
        autoPlay
        muted
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
        onLoadedMetadata={(e) => maybeRevealBeforeEnd(e.currentTarget)}
        onTimeUpdate={(e) => maybeRevealBeforeEnd(e.currentTarget)}
        aria-hidden
      >
        <source src="/falcon-video-v3.mp4" type="video/mp4" />
      </video>
      {!revealUi && showPlayFallback && (
        <button
          type="button"
          className="fixed inset-x-0 bottom-20 z-20 mx-auto w-fit rounded-full border border-white/40 bg-black/60 px-5 py-2 text-sm font-semibold text-white backdrop-blur-md"
          onClick={() => {
            void requestVideoPlay();
          }}
        >
          Tap to play intro
        </button>
      )}
      {!revealUi && <div className="fixed inset-0 z-1 " aria-hidden />}

      {revealUi && <Navbar />}
      <section
        id="join"
        className={`relative z-10 flex w-full flex-1 flex-col items-center justify-center overflow-hidden px-6 py-12 text-center sm:py-20 ${
          revealUi ? "min-h-0" : "min-h-dvh"
        }`}
      >
        {revealUi && (
          <>
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
              aria-hidden
              initial={{ opacity: 0, filter: "blur(14px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{
                duration: 0.45,
                delay: 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
            <motion.div
              className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-6 px-3 sm:px-0"
              variants={contentContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.p
                className="text-sm font-medium uppercase tracking-[0.2em] text-white/80"
                variants={fadeUp}
              >
                Early access
              </motion.p>
              <motion.h1
                className="w-full max-w-[12ch] text-center text-4xl leading-tight font-semibold tracking-wide text-white sm:max-w-none sm:text-5xl md:text-7xl"
                variants={fadeUp}
              >
                The Next-Gen Onchain Trading Experience
              </motion.h1>
              <motion.div className="mt-2 w-full max-w-5xl" variants={fadeUp}>
                <div className="feature-strip-marquee sm:hidden">
                  <div className="feature-strip-track">
                    {[...FEATURE_STRIP_ITEMS, ...FEATURE_STRIP_ITEMS].map(
                      (feature, index) => (
                        <span
                          key={`${feature.label}-${index}`}
                          className="inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-medium tracking-wide text-white/90 [&_svg]:opacity-90 [&_svg]:invert"
                        >
                          {feature.icon}
                          {feature.label}
                        </span>
                      ),
                    )}
                  </div>
                </div>
                <div className="hidden flex-wrap items-center justify-center gap-2 sm:flex">
                  {FEATURE_STRIP_ITEMS.map((feature) => (
                    <span
                      key={feature.label}
                      className="inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium tracking-wide text-white/90 [&_svg]:opacity-90 [&_svg]:invert"
                    >
                      {feature.icon}
                      {feature.label}
                    </span>
                  ))}
                </div>
              </motion.div>
              <motion.div
                className="flex w-full max-w-2xl flex-col items-center gap-3 px-4 sm:px-0"
                variants={fadeUp}
              >
                <form
                  className="flex w-full max-w-sm flex-col gap-2 sm:max-w-md sm:flex-row sm:items-center sm:gap-2 sm:overflow-hidden sm:rounded-full sm:bg-white/95 sm:p-1.5"
                  onSubmit={handleWaitlistSubmit}
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Your Email ID"
                    className="h-10 w-full rounded-full border-0 bg-white/95 px-4 text-sm text-black outline-none placeholder:text-neutral-800 sm:flex-1 sm:bg-transparent"
                    required
                  />
                  <button
                    type="submit"
                    className="cursor-pointer border border-white sm:border-none inline-flex h-10 w-full shrink-0 whitespace-nowrap items-center justify-center rounded-full bg-zinc-950 px-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:px-6"
                    disabled={submitState.loading}
                  >
                    {submitState.loading
                      ? "Joining Waitlist..."
                      : "Get Early Access"}
                  </button>
                </form>
                <p
                  className={`min-h-5 text-sm ${
                    submitState.message
                      ? submitState.error
                        ? "text-rose-300"
                        : "text-emerald-300"
                      : "invisible"
                  }`}
                  aria-live="polite"
                >
                  {submitState.message || "\u00A0"}
                </p>
              </motion.div>
            </motion.div>
          </>
        )}
      </section>
      {revealUi && <Footer />}
    </div>
  );
}
