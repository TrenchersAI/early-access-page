"use client";
import {
  type ClipboardEvent,
  type KeyboardEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import Footer from "../components/footer";
import Navbar from "../components/navbar";
import AiIcon from "../icons/ai-icon";
import CopyIcon from "../icons/copy-icon";
import SnipeIcon from "../icons/snipe-icon";
import TelegramIcon from "../icons/telegram-icon";
import TrackingIcon from "../icons/tracking-icon";
import XIcon from "../icons/x-icon";

/** Show navbar, overlay, and footer this many seconds before playback ends */
const REVEAL_BEFORE_END_SEC = 2;
/** Wall-clock cap for the `<video>` path. On slow networks the MP4 (iOS
   can't use the smaller WebM) buffers and `video.currentTime` advances far
   slower than real time, so the timeupdate-based reveal hook never fires in
   a reasonable window. */
const MAX_REVEAL_DELAY_MS = 2800;
/** Source clip duration. Animated `<img>` has no `timeupdate` callback, so
   we time the WebP-path reveal off this constant. Keep in sync with
   `falcon-video-v3.{webm,mp4,webp}` if the asset is re-encoded. */
const HERO_CLIP_DURATION_SEC = 5;

const contentContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.25,
    },
  },
};

/** `blur(200px)` interpolates to `blur(0px)` every frame during the animation,
   and iOS Safari runs filter blur through Core Image — at large radii it drops
   frames and the per-element animation drags well past its 0.5s budget,
   leaving the form feeling "stuck" for seconds after reveal. A small radius
   keeps the focus-in effect while staying cheap to composite. */
const fadeUp = {
  hidden: { opacity: 0, y: 22, filter: "blur(16px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

/** No-motion equivalents for users with prefers-reduced-motion enabled. */
const reducedContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0, delayChildren: 0 } },
};

const reducedFadeUp = {
  hidden: { opacity: 1, y: 0, filter: "blur(0px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

const FEATURE_STRIP_ITEMS = [
  { label: "Snipe New Launches", icon: <SnipeIcon /> },
  { label: "AI Trading Agents", icon: <AiIcon /> },
  { label: "Live Onchain Tracking", icon: <TrackingIcon /> },
  { label: "Copy Whales Trades", icon: <CopyIcon /> },
];
const LAUNCH_TWEET_URL =
  "https://x.com/TrenchersAI/status/2048148307650998392";

/** Safari Private Browsing throws on localStorage access — guard every call. */
const safeStorage = {
  get(key: string): string {
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem(key) ?? "";
    } catch {
      return "";
    }
  },
  set(key: string, value: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // private mode, quota exceeded, or storage disabled — drop silently
    }
  },
  remove(key: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

function getStoredVerifiedEmail() {
  return safeStorage.get("trencher_verified_email");
}

/** Match the middleware's ref-code regex so legacy `?ref=` query links AND
   the new `/CODE` path links both populate the referrer field. */
const PATH_REF_CODE_PATTERN = /^[a-z0-9]{6,12}$/;

function getReferralCodeFromUrl() {
  if (typeof window === "undefined") return "";
  const fromQuery = new URLSearchParams(window.location.search)
    .get("ref")
    ?.trim();
  if (fromQuery) return fromQuery;
  const segment = window.location.pathname.slice(1).split("/")[0];
  return PATH_REF_CODE_PATTERN.test(segment) ? segment : "";
}

export default function HomeClient({
  isInAppBrowser,
}: {
  isInAppBrowser: boolean;
}) {
  const initialVerifiedEmail = getStoredVerifiedEmail();
  const initialRefCode = getReferralCodeFromUrl();
  const [revealUi, setRevealUi] = useState(false);
  const [showPlayFallback, setShowPlayFallback] = useState(false);
  const [email, setEmail] = useState(initialVerifiedEmail);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  /** Optimistically trust localStorage on first render so entry animations
     can be skipped synchronously for returning users. The API confirmation
     in the useEffect below revokes this if the flag is stale. */
  const [isVerified, setIsVerified] = useState(!!initialVerifiedEmail);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralCount, setReferralCount] = useState(0);
  const [incomingRefCode] = useState(initialRefCode);
  const [submitState, setSubmitState] = useState<{
    loading: boolean;
    message: string;
    error: boolean;
  }>({
    loading: false,
    message: "",
    error: false,
  });
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const prefersReducedMotion = useReducedMotion();
  /** Verified users have already seen the cinematic intro once — replaying
     the staggered fade-up on every visit is friction. Treat the verified
     state the same as prefers-reduced-motion: render content instantly. */
  const skipMotion = isVerified || prefersReducedMotion;
  const containerVariants = skipMotion ? reducedContainer : contentContainer;
  const fadeUpVariants = skipMotion ? reducedFadeUp : fadeUp;
  const revealAppliedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const otp = otpDigits.join("");
  const normalizedEmail = email.trim().toLowerCase();
  const shareUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://trenchers.xyz";
  const myReferralCode = referralCode || normalizedEmail;
  const referralUrl = `${shareUrl}/${encodeURIComponent(myReferralCode)}`;
  const tier: "Bronze" | "Silver" | "Gold" | "Diamond" =
    referralCount >= 50
      ? "Diamond"
      : referralCount >= 15
        ? "Gold"
        : referralCount >= 3
          ? "Silver"
          : "Bronze";
  const nextTierThreshold =
    referralCount < 3
      ? 3
      : referralCount < 15
        ? 15
        : referralCount < 50
          ? 50
          : 50;
  const nextTierLabel: "Silver" | "Gold" | "Diamond" =
    referralCount < 3 ? "Silver" : referralCount < 15 ? "Gold" : "Diamond";
  const previousTierFloor =
    nextTierThreshold === 50 ? 15 : nextTierThreshold === 15 ? 3 : 0;
  const tierProgressMax = Math.max(1, nextTierThreshold - previousTierFloor);
  const tierProgressCurrent = Math.min(
    tierProgressMax,
    Math.max(0, referralCount - previousTierFloor),
  );
  const tierProgressPercent = Math.min(
    100,
    Math.round((tierProgressCurrent / tierProgressMax) * 100),
  );
  const referralsNeededForNextTier = Math.max(
    0,
    nextTierThreshold - referralCount,
  );
  const onboardedTierClass =
    tier === "Diamond"
      ? "border-[#e9d5ff] bg-[linear-gradient(150deg,#020617_0%,#1e3a8a_40%,#38bdf8_52%,#3730a3_72%,#020617_100%)] shadow-[0_22px_54px_rgba(2,6,23,0.7)] ring-1 ring-white/40 [box-shadow:inset_0_2px_0_rgba(255,255,255,0.4),inset_0_-3px_12px_rgba(15,23,42,0.68),inset_8px_0_14px_rgba(56,189,248,0.2),0_22px_54px_rgba(2,6,23,0.7)]"
      : tier === "Gold"
        ? "border-[#caa24d] bg-linear-to-br from-[#6f4f1b] via-[#b8871e] to-[#f2c766]"
        : tier === "Silver"
          ? "border-[#d1d5db] bg-linear-to-br from-[#4b5563] via-[#9ca3af] to-[#e5e7eb]"
          : "border-[#b08968] bg-linear-to-br from-[#5a3a22] via-[#9a6a3f] to-[#d4a373]";
  const foundingBadgeClass =
    tier === "Diamond"
      ? "border-[#e9d5ff] bg-[linear-gradient(150deg,#020617_0%,#1e3a8a_40%,#38bdf8_52%,#3730a3_72%,#020617_100%)] shadow-[0_14px_34px_rgba(2,6,23,0.62)] ring-1 ring-white/35 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-2px_8px_rgba(15,23,42,0.6),inset_6px_0_12px_rgba(56,189,248,0.16),0_14px_34px_rgba(2,6,23,0.62)]"
      : tier === "Gold"
        ? "border-[#caa24d] bg-linear-to-r from-[#6f4f1b] via-[#b8871e] to-[#f2c766]"
        : tier === "Silver"
          ? "border-[#d1d5db] bg-linear-to-r from-[#4b5563] via-[#9ca3af] to-[#e5e7eb]"
          : "border-[#b08968] bg-linear-to-r from-[#5a3a22] via-[#9a6a3f] to-[#d4a373]";

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
    /** In-app-browser path: the `<video>` element isn't mounted (animated WebP
       is rendered instead), so there's nothing to wire. The reveal is timed
       off `HERO_CLIP_DURATION_SEC` from a separate effect below. */
    if (isInAppBrowser) return;

    const v = videoRef.current;
    if (!v) return;

    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    v.playsInline = true;

    /** Returning verified users (localStorage flag present) have already seen
       the cinematic intro. Skip playback entirely and freeze the video on its
       final frame so the post-signup UI renders against a static backdrop
       instead of replaying the intro every visit. */
    if (initialVerifiedEmail) {
      if (!revealAppliedRef.current) {
        revealAppliedRef.current = true;
        setRevealUi(true);
      }
      const seekToEnd = () => {
        const target = Math.max(0, (v.duration || 5) - 0.05);
        try {
          v.currentTime = target;
        } catch {
          // Some browsers throw if duration isn't known yet — the
          // loadedmetadata listener will retry.
        }
        v.pause();
      };
      if (Number.isFinite(v.duration) && v.duration > 0) {
        seekToEnd();
      }
      v.addEventListener("loadedmetadata", seekToEnd, { once: true });
      return () => {
        v.removeEventListener("loadedmetadata", seekToEnd);
      };
    }

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
    const revealCapT = window.setTimeout(() => {
      if (revealAppliedRef.current) return;
      revealAppliedRef.current = true;
      setRevealUi(true);
      setShowPlayFallback(false);
    }, MAX_REVEAL_DELAY_MS);

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
      window.clearTimeout(revealCapT);
      v.removeEventListener("loadedmetadata", tryPlay);
      v.removeEventListener("loadeddata", tryPlay);
      v.removeEventListener("canplay", tryPlay);
      v.removeEventListener("canplaythrough", tryPlay);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("pause", onPause);
      document.removeEventListener("touchend", onFirstInteraction);
      document.removeEventListener("click", onFirstInteraction);
    };
  }, [requestVideoPlay, initialVerifiedEmail, isInAppBrowser]);

  /** WebP-path reveal: animated `<img>` doesn't expose `currentTime`, so
     fire the reveal at `HERO_CLIP_DURATION_SEC - REVEAL_BEFORE_END_SEC` after
     the WebP has finished decoding (signalled by `<img onLoad>` flipping
     `webpReadyAt`). For verified users the WebP isn't shown — reveal is set
     synchronously on initial render below. */
  const [webpReadyAt, setWebpReadyAt] = useState<number | null>(null);
  useEffect(() => {
    if (!isInAppBrowser || initialVerifiedEmail) return;
    if (webpReadyAt === null) return;
    if (revealAppliedRef.current) return;
    const delayMs = Math.max(
      0,
      (HERO_CLIP_DURATION_SEC - REVEAL_BEFORE_END_SEC) * 1000,
    );
    const id = window.setTimeout(() => {
      if (revealAppliedRef.current) return;
      revealAppliedRef.current = true;
      setRevealUi(true);
    }, delayMs);
    return () => window.clearTimeout(id);
  }, [isInAppBrowser, initialVerifiedEmail, webpReadyAt]);

  /** Verified users in the WebP path get the form immediately — no animated
     intro to time off of. Mirrors the `if (initialVerifiedEmail) seekToEnd()`
     branch in the `<video>` effect above. */
  useEffect(() => {
    if (!isInAppBrowser || !initialVerifiedEmail) return;
    if (revealAppliedRef.current) return;
    revealAppliedRef.current = true;
    setRevealUi(true);
  }, [isInAppBrowser, initialVerifiedEmail]);

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
    if (otpStep === "verify" && !/^\d{6}$/.test(otp.trim())) {
      setSubmitState({
        loading: false,
        message: "Please enter the 6-digit code.",
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
        body: JSON.stringify({
          email,
          ...(otpStep === "request" && incomingRefCode
            ? { ref: incomingRefCode }
            : {}),
          ...(otpStep === "verify" ? { otp: otp.trim() } : {}),
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        requiresOtp?: boolean;
        verified?: boolean;
        referralCode?: string;
        referralCount?: number;
        retryAfterSeconds?: number;
      };
      const message = data.message ?? "Request completed.";

      if (!response.ok) {
        if (
          response.status === 429 &&
          typeof data.retryAfterSeconds === "number"
        ) {
          setResendCooldown(data.retryAfterSeconds);
          if (data.requiresOtp) {
            setOtpStep("verify");
          }
        }
        setSubmitState({
          loading: false,
          message,
          error: true,
        });
        return;
      }

      if (typeof data.retryAfterSeconds === "number") {
        setResendCooldown(data.retryAfterSeconds);
      }

      setSubmitState({
        loading: false,
        message,
        error: false,
      });
      if (typeof data.referralCode === "string") {
        setReferralCode(data.referralCode);
      }
      if (typeof data.referralCount === "number") {
        setReferralCount(data.referralCount);
      }
      if (otpStep === "request") {
        if (data.verified) {
          setIsVerified(true);
          setOtpStep("request");
          setOtpDigits(Array(6).fill(""));
          if (normalizedEmail) {
            safeStorage.set("trencher_verified_email", normalizedEmail);
          }
        } else if (data.requiresOtp) {
          setOtpStep("verify");
        }
      } else {
        setIsVerified(true);
        setOtpDigits(Array(6).fill(""));
        setSubmitState({
          loading: false,
          message: "Welcome to Trenchers. Check your email for confirmation.",
          error: false,
        });
        if (normalizedEmail) {
          safeStorage.set("trencher_verified_email", normalizedEmail);
        }
      }
    } catch {
      setSubmitState({
        loading: false,
        message: "Unable to submit right now. Please try again.",
        error: true,
      });
    }
  };

  const updateOtpAtIndex = useCallback((index: number, digit: string) => {
    setOtpDigits((prev) => {
      const chars = [...prev];
      chars[index] = digit;
      return chars;
    });
  }, []);

  const handleOtpInputChange = (index: number, rawValue: string) => {
    const digit = rawValue.replace(/\D/g, "").slice(-1);
    updateOtpAtIndex(index, digit);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      updateOtpAtIndex(index - 1, "");
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!pasted) return;

    const nextOtpDigits = Array(6).fill("");
    for (let i = 0; i < pasted.length; i += 1) {
      nextOtpDigits[i] = pasted[i];
    }
    setOtpDigits(nextOtpDigits);
    const focusIndex = Math.min(pasted.length, 6) - 1;
    if (focusIndex >= 0) {
      otpInputRefs.current[focusIndex]?.focus();
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || submitState.loading) return;
    setSubmitState({ loading: true, message: "", error: false });
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          ...(incomingRefCode ? { ref: incomingRefCode } : {}),
        }),
      });
      const data = (await response.json()) as {
        message?: string;
        retryAfterSeconds?: number;
      };
      if (typeof data.retryAfterSeconds === "number") {
        setResendCooldown(data.retryAfterSeconds);
      }
      setSubmitState({
        loading: false,
        message:
          data.message ??
          (response.ok
            ? "New code sent. Check your inbox."
            : "Couldn't resend."),
        error: !response.ok,
      });
    } catch {
      setSubmitState({
        loading: false,
        message: "Unable to resend right now.",
        error: true,
      });
    }
  };

  useEffect(() => {
    if (otpStep === "verify") {
      otpInputRefs.current[0]?.focus();
    }
  }, [otpStep]);

  useEffect(() => {
    if (!initialVerifiedEmail) return;
    let cancelled = false;

    const restoreVerifiedState = async () => {
      try {
        const response = await fetch(
          `/api/waitlist?email=${encodeURIComponent(initialVerifiedEmail)}`,
        );
        if (!response.ok) {
          safeStorage.remove("trencher_verified_email");
          if (!cancelled) setIsVerified(false);
          return;
        }

        const data = (await response.json()) as {
          verified?: boolean;
          referralCode?: string;
          referralCount?: number;
        };
        if (cancelled) return;

        if (!data.verified) {
          safeStorage.remove("trencher_verified_email");
          setIsVerified(false);
          return;
        }

        setIsVerified(true);
        if (typeof data.referralCode === "string") {
          setReferralCode(data.referralCode);
        }
        if (typeof data.referralCount === "number") {
          setReferralCount(data.referralCount);
        }
      } catch {
        safeStorage.remove("trencher_verified_email");
        if (!cancelled) setIsVerified(false);
      }
    };

    void restoreVerifiedState();
    return () => {
      cancelled = true;
    };
  }, [initialVerifiedEmail]);

  useEffect(() => {
    if (!isVerified || !normalizedEmail) return;
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const response = await fetch(
          `/api/waitlist?email=${encodeURIComponent(normalizedEmail)}`,
        );
        if (!response.ok) return;
        const data = (await response.json()) as {
          referralCode?: string;
          referralCount?: number;
        };
        if (cancelled) return;
        if (typeof data.referralCode === "string") {
          setReferralCode(data.referralCode);
        }
        if (typeof data.referralCount === "number") {
          setReferralCount(data.referralCount);
        }
      } catch {
        // ignore dashboard refresh failures
      }
    };

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [isVerified, normalizedEmail]);

  const handleCopyReferral = async () => {
    /** navigator.clipboard requires a secure context and is unavailable in
       some embedded webviews. Surface a "Copy failed" state so users on
       those browsers know to copy the visible URL manually. */
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(referralUrl);
      setCopiedReferral(true);
      setCopyState("copied");
      window.setTimeout(() => {
        setCopiedReferral(false);
        setCopyState("idle");
      }, 1400);
    } catch {
      setCopiedReferral(false);
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  };

  const handleShareOnX = () => {
    const tweetText = `I'm officially a Trencher now 🔥
just locked in early access to @TrenchersAI

Let's run it up together!
join the trenches → ${referralUrl}
#TrenchersAI`;

    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(LAUNCH_TWEET_URL)}`;

    window.open(shareUrl, "_blank", "noopener,noreferrer");

    // TODO: track share event
  };

  const handleShareOnTelegram = () => {
    const telegramText = `I'm officially a Trencher now 🔥
just locked in early access to @TrenchersAI

Let's run it up together!
join the trenches:`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(telegramText)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");

    // TODO: track share event
  };

  return (
    <div className="flex min-h-dvh w-full flex-1 flex-col sm:h-dvh sm:overflow-hidden">
      {/* Fixed layer: avoid flex/transform ancestors; object-center so crop stays stable.
          iOS in-app browsers (X/Twitter, Instagram, FB, LinkedIn, Discord, Android
          Chrome WebView) refuse `<video>` autoplay even with muted+playsinline.
          Animated WebP has no such restriction — it autoplays unconditionally —
          so we serve it instead of `<video>` for those user agents. Detection
          happens server-side in `page.tsx` from the request UA. */}
      {isInAppBrowser ? (
        initialVerifiedEmail ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src="/falcon-poster.jpg"
            alt=""
            className="bg-video"
            aria-hidden
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src="/falcon-video-v3.webp"
            alt=""
            className="bg-video"
            decoding="async"
            onLoad={() => setWebpReadyAt(Date.now())}
            aria-hidden
          />
        )
      ) : (
        <video
          ref={videoRef}
          className="bg-video"
          autoPlay={!initialVerifiedEmail}
          muted
          playsInline
          preload="metadata"
          poster="/falcon-poster.jpg"
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          onLoadedMetadata={(e) => maybeRevealBeforeEnd(e.currentTarget)}
          onTimeUpdate={(e) => maybeRevealBeforeEnd(e.currentTarget)}
          aria-hidden
        >
          {/* WebM listed first: Chrome/Firefox/Edge pick it for ~50% bandwidth
              savings; iOS Safari falls through to the MP4. */}
          <source src="/falcon-video-v3.webm" type="video/webm" />
          <source src="/falcon-video-v3.mp4" type="video/mp4" />
        </video>
      )}
      {!revealUi && showPlayFallback && !isInAppBrowser && (
        <button
          type="button"
          className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-20 mx-auto w-fit rounded-full border border-white/40 bg-black/60 px-5 py-2 text-sm font-semibold text-white backdrop-blur-md"
          onClick={() => {
            void requestVideoPlay();
          }}
        >
          Tap to play intro
        </button>
      )}
      {!revealUi && <div className="fixed inset-0 z-1 " aria-hidden />}

      {revealUi && <Navbar isVerified={isVerified} />}
      <section
        id="join"
        className={`relative z-10 flex min-h-0 w-full flex-1 flex-col items-center overflow-hidden px-6 pb-12 text-center sm:pb-16 ${
          !isVerified && otpStep === "request"
            ? "justify-center py-12 sm:py-16"
            : "justify-start pt-4 sm:pt-6"
        }`}
      >
        {revealUi && (
          <>
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
              aria-hidden
              initial={
                skipMotion
                  ? { opacity: 1, filter: "blur(0px)" }
                  : { opacity: 0, filter: "blur(14px)" }
              }
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{
                duration: skipMotion ? 0 : 0.45,
                delay: skipMotion ? 0 : 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
            <motion.div
              className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-6 px-3 sm:px-0"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {!isVerified && (
                <>
                  <motion.p
                    className="text-sm font-medium uppercase tracking-[0.2em] text-white/80"
                    variants={fadeUpVariants}
                  >
                    Early access
                  </motion.p>
                  <motion.h1
                    className="w-full max-w-[17ch] text-center text-4xl leading-tight font-semibold tracking-wide text-white max-[420px]:max-w-[14ch] max-[420px]:text-[2rem] max-[420px]:leading-[1.06] max-[350px]:text-[1.7rem] max-[350px]:leading-[1.08] sm:max-w-none sm:text-5xl md:text-7xl"
                    variants={fadeUpVariants}
                  >
                    AI THAT TRADES BEFORE YOU CLICK
                  </motion.h1>
                </>
              )}
              <motion.div className="mt-2 w-full max-w-5xl" variants={fadeUpVariants}>
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
                variants={fadeUpVariants}
              >
                {isVerified ? (
                  <div className="w-full max-w-[480px] rounded-[20px] border border-white/10 bg-gradient-to-br from-black/55 via-black/40 to-black/30 p-8 text-left text-[#fafafa] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-1px_0_rgba(255,255,255,0.06),0_24px_70px_rgba(0,0,0,0.58)] backdrop-blur-2xl [-webkit-backdrop-filter:blur(36px)] max-[420px]:mx-0 max-[420px]:w-full max-[420px]:p-4">
                    <div
                      className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${foundingBadgeClass}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      <span className="text-[10.5px] font-medium tracking-[0.12em] text-white">
                        FOUNDING TRENCHER
                      </span>
                    </div>
                    <h2 className="text-[24px] leading-[1.2] font-medium tracking-[-0.01em] text-[#fafafa]">
                      You&apos;re in the trenches.
                    </h2>
                    <p className="mt-3 text-[13.5px] leading-[1.5] text-neutral-400">
                      Share your referral link to onboard more trenchers.
                    </p>

                    <div
                      className={`mt-5 rounded-[12px] border p-[1.1rem] ${onboardedTierClass}`}
                    >
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[10.5px] font-medium tracking-[0.12em] text-[#fafafa]">
                            TRENCHERS ONBOARDED
                          </p>
                          <p className="mt-2 font-mono text-[36px] leading-none font-medium text-[#fafafa]">
                            {referralCount}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10.5px] font-medium tracking-[0.12em] text-[#fafafa]">
                            TIER
                          </p>
                          <p className="mt-2 text-[13.5px] font-extrabold tracking-[0.08em] text-[#fafafa] uppercase">
                            {tier}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 h-1 rounded-full bg-[#1f1f1f]">
                        <div
                          className="h-1 rounded-full bg-[#fafafa]"
                          style={{ width: `${tierProgressPercent}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10.5px] font-medium tracking-[0.12em] text-[#fafafa]">
                        <span>{`${referralsNeededForNextTier} MORE → ${nextTierLabel}`}</span>
                        <span className="font-mono">{`${Math.min(referralCount, nextTierThreshold)} / ${nextTierThreshold}`}</span>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[10px] border border-neutral-800 bg-white/[0.03] py-[5px] pr-[5px] pl-[14px]">
                      <div className="flex items-center gap-3 rounded-[8px] px-2 py-1">
                        <p className="min-w-0 flex-1 truncate font-medium text-[13px] text-[#fafafa]">
                          {referralUrl}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            void handleCopyReferral();
                          }}
                          className="cursor-pointer rounded-[8px] bg-[#1f1f1f] px-[14px] py-[8px] text-[13.5px] font-medium text-[#fafafa] transition-all duration-200 hover:bg-[#1f1f1f]/50"
                          aria-label={
                            copyState === "failed"
                              ? "Copy failed. Select the link manually."
                              : copyState === "copied"
                                ? "Referral link copied"
                                : "Copy referral link"
                          }
                        >
                          {copyState === "failed"
                            ? "Copy failed"
                            : copiedReferral
                              ? "Copied"
                              : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex w-full flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={handleShareOnX}
                        className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-neutral-700 bg-black px-4 py-3 text-[14.5px] font-bold text-white transition-all duration-300 hover:bg-neutral-900 [&_svg]:h-5 [&_svg]:w-5"
                      >
                        Share on
                        <XIcon />
                      </button>
                      <button
                        type="button"
                        onClick={handleShareOnTelegram}
                        className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[#229ED9] bg-[#229ED9] px-4 py-3 text-[14.5px] font-bold text-white transition-all duration-300 hover:bg-[#229ED9]/80"
                      >
                        <TelegramIcon />
                        Telegram
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <form
                      className={`flex w-full flex-col items-center gap-2 sm:w-auto sm:gap-2 sm:p-1.5 ${
                        otpStep === "verify"
                          ? "!w-fit max-w-full rounded-3xl border-white/10 bg-gradient-to-br from-black/55 via-black/40 to-black/30 px-4 py-4 shadow-[0_12px_30px_rgba(0,0,0,0.3)] sm:max-w-xl sm:flex-wrap sm:p-5 sm:shadow-none"
                          : "max-w-md sm:max-w-md sm:flex-row sm:overflow-hidden sm:rounded-full sm:bg-white/95 sm:p-1.5"
                      }`}
                      onSubmit={handleWaitlistSubmit}
                    >
                      {otpStep !== "verify" && (
                        <div className="flex w-full justify-center">
                          <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="Please Enter Your Email ID"
                            autoComplete="email"
                            inputMode="email"
                            /* text-base (16px) on mobile prevents iOS Safari from zooming on focus */
                            className="h-10 w-full min-w-0 rounded-full border-0 bg-white/95 px-4 text-center text-base text-black outline-none placeholder:text-neutral-800 sm:flex-1 sm:bg-transparent sm:px-4 sm:text-sm"
                            required
                          />
                        </div>
                      )}

                      {otpStep === "verify" && (
                        <div className="mb-1 flex w-full flex-nowrap items-center justify-center gap-1 px-1 sm:gap-2 sm:px-0">
                          {Array.from({ length: 6 }).map((_, index) => (
                            <input
                              key={`otp-${index}`}
                              ref={(element) => {
                                otpInputRefs.current[index] = element;
                              }}
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]"
                              maxLength={1}
                              value={otpDigits[index]}
                              onChange={(event) =>
                                handleOtpInputChange(index, event.target.value)
                              }
                              onKeyDown={(event) =>
                                handleOtpKeyDown(index, event)
                              }
                              onPaste={handleOtpPaste}
                              autoComplete="one-time-code"
                              /* text-base on mobile to avoid iOS focus zoom; tighter on desktop */
                              className="h-8 w-8 rounded-xl border border-white/30 bg-white/95 text-center text-xs font-semibold text-black outline-none focus:ring-2 focus:ring-white/60 sm:h-11 sm:w-11 sm:text-sm"
                              aria-label={`Code digit ${index + 1}`}
                              required
                            />
                          ))}
                        </div>
                      )}
                      <div
                        className={
                          otpStep === "verify" ? "w-auto" : "w-full sm:w-auto"
                        }
                      >
                        {otpStep === "verify" ? (
                          <div className="mt-1 flex w-full flex-col items-center gap-4">
                            <button
                              type="submit"
                              className="enabled:cursor-pointer inline-flex h-10 w-[15rem] max-w-full items-center justify-center rounded-full border bg-zinc-950 px-5 text-[13px] font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 sm:w-full sm:max-w-md sm:px-8 sm:text-sm"
                              disabled={submitState.loading}
                            >
                              {submitState.loading
                                ? "Verifying Code..."
                                : "Verify & Join"}
                            </button>
                            <div className="mt-1 flex items-center justify-center gap-4 text-sm">
                              <button
                                type="button"
                                className="cursor-pointer bg-transparent text-white/85 underline-offset-4 transition hover:text-white hover:underline disabled:cursor-not-allowed disabled:text-white/40"
                                onClick={() => {
                                  setOtpStep("request");
                                  setOtpDigits(Array(6).fill(""));
                                  setSubmitState({
                                    loading: false,
                                    message: "",
                                    error: false,
                                  });
                                }}
                                disabled={submitState.loading}
                              >
                                Change Email
                              </button>
                              <span className="text-white/25" aria-hidden>
                                |
                              </span>
                              <button
                                type="button"
                                className="cursor-pointer bg-transparent text-white/85 underline-offset-4 transition hover:text-white hover:underline disabled:cursor-not-allowed disabled:text-white/40"
                                onClick={handleResendOtp}
                                disabled={
                                  submitState.loading || resendCooldown > 0
                                }
                              >
                                {resendCooldown > 0
                                  ? `Resend in ${resendCooldown}s`
                                  : "Resend Code"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex w-full justify-end sm:w-auto">
                            <button
                              type="submit"
                              className="enabled:cursor-pointer inline-flex h-10 w-full max-w-md shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-white bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:max-w-none sm:border-none sm:px-8"
                              disabled={submitState.loading}
                            >
                              {submitState.loading
                                ? "Sending code..."
                                : "Join Now"}
                            </button>
                          </div>
                        )}
                      </div>
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
                  </>
                )}
              </motion.div>
            </motion.div>
          </>
        )}
      </section>
      {revealUi && <Footer isVerified={isVerified} />}
    </div>
  );
}
