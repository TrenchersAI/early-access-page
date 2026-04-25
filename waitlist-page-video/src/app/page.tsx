"use client";
// added for testing.
import {
  type ClipboardEvent,
  type KeyboardEvent,
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
import TelegramIcon from "../icons/telegram-icon";
import TrackingIcon from "../icons/tracking-icon";
import XIcon from "../icons/x-icon";

/** Show navbar, overlay, and footer this many seconds before playback ends */
const REVEAL_BEFORE_END_SEC = 2;

const contentContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.14,
      delayChildren: 1,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 22, filter: "blur(200px)" },
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
const LAUNCH_TWEET_URL =
  "https://x.com/iamatrencher/status/2047278343763153397";

function getStoredVerifiedEmail() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("trencher_verified_email") ?? "";
}

function getReferralCodeFromUrl() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("ref")?.trim() ?? "";
}

export default function Home() {
  const initialVerifiedEmail = getStoredVerifiedEmail();
  const initialRefCode = getReferralCodeFromUrl();
  const [revealUi, setRevealUi] = useState(false);
  const [showPlayFallback, setShowPlayFallback] = useState(false);
  const [email, setEmail] = useState(initialVerifiedEmail);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [isVerified, setIsVerified] = useState(false);
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
  const revealAppliedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const otp = otpDigits.join("");
  const normalizedEmail = email.trim().toLowerCase();
  const shareUrl =
    typeof window !== "undefined" ? window.location.origin : "https://trenchers.xyz";
  const myReferralCode = referralCode || normalizedEmail;
  const referralUrl = `${shareUrl}/?ref=${encodeURIComponent(myReferralCode)}`;
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
    referralCount < 3
      ? "Silver"
      : referralCount < 15
        ? "Gold"
        : "Diamond";
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
  const referralsNeededForNextTier = Math.max(0, nextTierThreshold - referralCount);
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
    if (otpStep === "verify" && !/^\d{6}$/.test(otp.trim())) {
      setSubmitState({
        loading: false,
        message: "Please enter the 6-digit OTP.",
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
            localStorage.setItem("trencher_verified_email", normalizedEmail);
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
          localStorage.setItem("trencher_verified_email", normalizedEmail);
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
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
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
          (response.ok ? "New code sent. Check your inbox." : "Couldn't resend."),
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
          localStorage.removeItem("trencher_verified_email");
          return;
        }

        const data = (await response.json()) as {
          verified?: boolean;
          referralCode?: string;
          referralCount?: number;
        };
        if (cancelled) return;

        if (!data.verified) {
          localStorage.removeItem("trencher_verified_email");
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
        localStorage.removeItem("trencher_verified_email");
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
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopiedReferral(true);
      window.setTimeout(() => setCopiedReferral(false), 1400);
    } catch {
      setCopiedReferral(false);
    }
  };

  const handleShareOnX = () => {
    const tweetText = `just locked in early access to @trenchersai 🪖

the next-gen onchain trading terminal — snipe faster, exit cleaner, trade safer.

join the trenches → ${referralUrl}`;

    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(LAUNCH_TWEET_URL)}`;

    window.open(shareUrl, "_blank", "noopener,noreferrer");

    // TODO: track share event
  };

  const handleShareOnTelegram = () => {
    const telegramText = `just locked in early access to @trenchersai 🪖 the next-gen onchain trading terminal. join the trenches:`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(telegramText)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");

    // TODO: track share event
  };

  return (
    <div className="flex min-h-dvh w-full flex-1 flex-col sm:h-dvh sm:overflow-hidden">
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
        className="relative z-10 flex min-h-0 w-full flex-1 flex-col items-center justify-center px-6 py-12 text-center sm:overflow-hidden sm:py-20"
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
              {!isVerified && (
                <>
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
                    AI THAT TRADES BEFORE YOU CLICK
                  </motion.h1>
                </>
              )}
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
                {isVerified ? (
                  <div className="w-full max-w-[480px] rounded-[20px] border border-white bg-[rgba(0,0,0,0.6)] p-8 text-left text-[#fafafa] shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-[24px] [webkit-backdrop-filter:blur(24px)] max-[420px]:mx-0 max-[420px]:w-full max-[420px]:p-4">
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
                    <p className="mt-3 text-[13.5px] leading-[1.5] text-white">
                      Share your referral link to onboard more trenchers.
                    </p>

                    <div className={`mt-5 rounded-[12px] border p-[1.1rem] ${onboardedTierClass}`}>
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

                    <div className="mt-4 rounded-[10px] border border-white bg-white/[0.03] py-[5px] pr-[5px] pl-[14px]">
                      <div className="flex items-center gap-3 rounded-[8px] px-2 py-1">
                        <p className="min-w-0 flex-1 truncate font-medium text-[13px] text-[#fafafa]">
                          {referralUrl}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            void handleCopyReferral();
                          }}
                          className="rounded-[8px] bg-[#1f1f1f] px-[14px] py-[8px] text-[13.5px] font-medium text-[#fafafa] cursor-pointer"
                        >
                          {copiedReferral ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={handleShareOnX}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-[10px] border border-white bg-black px-4 py-3 text-[14.5px] font-bold text-white [&_svg]:h-5 [&_svg]:w-5"
                      >
                        Share on
                        <XIcon />
                      </button>
                      <button
                        type="button"
                        onClick={handleShareOnTelegram}
                        className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#229ED9] bg-[#229ED9] px-4 py-3 text-[14.5px] font-bold text-white"
                      >
                        <TelegramIcon />
                        Telegram
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <form
                      className={`flex flex-col items-center gap-2 sm:gap-2 sm:bg-white/95 sm:p-1.5 ${
                        otpStep === "verify"
                          ? "max-w-md sm:max-w-xl sm:flex-wrap sm:rounded-3xl sm:p-5"
                          : "max-w-md sm:max-w-md sm:flex-row sm:overflow-hidden sm:rounded-full sm:p-1.5"
                      }`}
                      onSubmit={handleWaitlistSubmit}
                    >
                      <div className="w-full flex justify-center">
                        <input
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="Please Enter Your Email ID"
                          className={`h-10 w-full max-w-md rounded-full border-0 bg-white/95 px-4 text-sm text-black outline-none placeholder:text-neutral-800 sm:flex-1 sm:bg-transparent text-center  ${
                            otpStep === "verify"
                              ? "sm:border sm:border-black"
                              : ""
                          }`}
                          required
                          disabled={otpStep === "verify"}
                        />
                      </div>

                      {otpStep === "verify" && (
                        <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:justify-center">
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
                              onKeyDown={(event) => handleOtpKeyDown(index, event)}
                              onPaste={handleOtpPaste}
                              className="h-10 w-10 rounded-xl border border-white/30 bg-white/95 text-center text-sm font-semibold text-black outline-none focus:ring-2 focus:ring-white/60 sm:h-11 sm:w-11"
                              aria-label={`OTP digit ${index + 1}`}
                              required
                            />
                          ))}
                        </div>
                      )}
                      <div className="sm:flex sm:flex-row gap-3">
                      {otpStep === "verify" && (
                        <button
                          type="button"
                          className="cursor-pointer inline-flex h-10 w-full shrink-0 whitespace-nowrap items-center justify-center rounded-full border border-white bg-transparent px-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto sm:px-6 sm:text-black sm:border-black"
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
                      )}
                      {otpStep === "verify" && (
                        <button
                          type="button"
                          className="cursor-pointer inline-flex h-10 w-full shrink-0 whitespace-nowrap items-center justify-center rounded-full border border-white bg-transparent px-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6 sm:text-black sm:border-black"
                          onClick={handleResendOtp}
                          disabled={
                            submitState.loading || resendCooldown > 0
                          }
                        >
                          {resendCooldown > 0
                            ? `Resend in ${resendCooldown}s`
                            : "Resend OTP"}
                        </button>
                      )}
                      <button
                        type="submit"
                        className="not-even:cursor-pointer border border-white sm:border-none inline-flex h-10 w-full shrink-0 whitespace-nowrap items-center justify-center rounded-full bg-zinc-950 px-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:px-8"
                        disabled={submitState.loading}
                      >
                        {submitState.loading
                          ? otpStep === "verify"
                            ? "Verifying OTP..."
                            : "Sending OTP..."
                          : otpStep === "verify"
                            ? "Verify & Join"
                            : "Get OTP"}
                      </button>
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
      {revealUi && <Footer />}
    </div>
  );
}
