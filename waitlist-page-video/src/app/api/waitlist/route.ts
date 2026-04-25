import { getPrismaClient } from "../../../lib/prisma";
import {
  sendWaitlistConfirmationEmail,
  sendWaitlistOtpEmail,
} from "../../../lib/email";

export const runtime = "nodejs";

type WaitlistBody = {
  email?: string;
  otp?: string;
  ref?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_REGEX = /^\d{6}$/;
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateReferralCode() {
  return Math.random().toString(36).slice(2, 10);
}

export async function GET(request: Request) {
  try {
    const prisma = getPrismaClient();
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.trim().toLowerCase();

    if (!email || !EMAIL_REGEX.test(email)) {
      return Response.json({ message: "Please provide a valid email." }, { status: 400 });
    }

    const subscriber = await prisma.waitlistSubscriber.findUnique({
      where: { email },
      select: {
        isVerified: true,
        referralCode: true,
        referralsMade: true,
      },
    });

    if (!subscriber) {
      return Response.json({ message: "Subscriber not found." }, { status: 404 });
    }

    return Response.json(
      {
        verified: subscriber.isVerified,
        referralCode: subscriber.referralCode,
        referralCount: subscriber.referralsMade,
      },
      { status: 200 },
    );
  } catch {
    return Response.json(
      { message: "Something went wrong while fetching dashboard data." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const prisma = getPrismaClient();
    const body = (await request.json()) as WaitlistBody;
    const email = body.email?.trim().toLowerCase();
    const otp = body.otp?.trim();
    const ref = body.ref?.trim();

    if (!email || !EMAIL_REGEX.test(email)) {
      return Response.json(
        { message: "Please provide a valid email.", requiresOtp: false, verified: false },
        { status: 400 },
      );
    }

    const existing = await prisma.waitlistSubscriber.findUnique({
      where: { email },
      select: {
        id: true,
        isVerified: true,
        referredById: true,
        referralCode: true,
        referralsMade: true,
        otpCode: true,
        otpExpiresAt: true,
      },
    });

    if (otp) {
      if (!OTP_REGEX.test(otp)) {
        return Response.json(
          { message: "Enter a valid 6-digit code.", requiresOtp: true, verified: false },
          { status: 400 },
        );
      }

      if (!existing) {
        return Response.json(
          {
            message:
              "No waitlist request found for this email. Request a code first.",
            requiresOtp: false,
            verified: false,
          },
          { status: 404 },
        );
      }

      if (existing.isVerified) {
        return Response.json(
          {
            message: "Email already verified. You're already on the waitlist.",
            requiresOtp: false,
            verified: true,
            referralCode: existing.referralCode,
            referralCount: existing.referralsMade,
          },
          { status: 200 },
        );
      }

      const expired =
        !existing.otpExpiresAt || existing.otpExpiresAt.getTime() < Date.now();
      if (!existing.otpCode || expired || existing.otpCode !== otp) {
        return Response.json(
          {
            message: "Invalid or expired code. Please request a new one.",
            requiresOtp: true,
            verified: false,
          },
          { status: 400 },
        );
      }

      const verifiedSubscriber = await prisma.$transaction(async (tx) => {
        if (existing.referredById) {
          await tx.waitlistSubscriber.update({
            where: { id: existing.referredById },
            data: {
              referralsMade: {
                increment: 1,
              },
            },
          });
        }

        return tx.waitlistSubscriber.update({
          where: { email },
          data: {
            isVerified: true,
            verifiedAt: new Date(),
            otpCode: null,
            otpExpiresAt: null,
          },
          select: {
            referralCode: true,
            referralsMade: true,
          },
        });
      });

      try {
        await sendWaitlistConfirmationEmail({ to: email });
      } catch (error) {
        console.error("Failed to send waitlist confirmation email:", error);
      }

      return Response.json(
        {
          message: "Email verified. You're in the trenches.",
          requiresOtp: false,
          verified: true,
          referralCode: verifiedSubscriber.referralCode,
          referralCount: verifiedSubscriber.referralsMade,
        },
        { status: 200 },
      );
    }

    if (existing?.isVerified) {
      return Response.json(
        {
          message: "You're already on the waitlist.",
          requiresOtp: false,
          verified: true,
          referralCode: existing.referralCode,
          referralCount: existing.referralsMade,
        },
        { status: 200 },
      );
    }

    if (existing?.otpExpiresAt) {
      const issuedAtMs =
        existing.otpExpiresAt.getTime() - OTP_EXPIRY_MS;
      const cooldownEndsAtMs = issuedAtMs + OTP_RESEND_COOLDOWN_MS;
      const now = Date.now();
      if (now < cooldownEndsAtMs) {
        const retryAfterSeconds = Math.ceil(
          (cooldownEndsAtMs - now) / 1000,
        );
        return Response.json(
          {
            message: `Please wait ${retryAfterSeconds}s before requesting a new code.`,
            requiresOtp: true,
            verified: false,
            retryAfterSeconds,
          },
          {
            status: 429,
            headers: { "Retry-After": retryAfterSeconds.toString() },
          },
        );
      }
    }

    const otpCode = generateOtpCode();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    if (existing) {
      await prisma.waitlistSubscriber.update({
        where: { email },
        data: {
          otpCode,
          otpExpiresAt,
        },
      });
    } else {
      const referrer =
        ref && ref.length > 0
          ? await prisma.waitlistSubscriber.findUnique({
              where: { referralCode: ref },
              select: { id: true, email: true },
            })
          : null;

      await prisma.waitlistSubscriber.create({
        data: {
          email,
          referralCode: generateReferralCode(),
          referredById: referrer?.email !== email ? (referrer?.id ?? null) : null,
          otpCode,
          otpExpiresAt,
        },
      });
    }

    try {
      await sendWaitlistOtpEmail({ to: email, otp: otpCode });
    } catch (error) {
      console.error("Failed to send waitlist OTP email:", error);
      return Response.json(
        {
          message: "Unable to send code right now. Please try again.",
          requiresOtp: false,
          verified: false,
        },
        { status: 503 },
      );
    }

    return Response.json(
      {
        message: "Code sent. Check your inbox and verify to join the waitlist.",
        requiresOtp: true,
        verified: false,
        retryAfterSeconds: Math.ceil(OTP_RESEND_COOLDOWN_MS / 1000),
      },
      { status: 200 },
    );
  } catch {
    return Response.json(
      {
        message: "Something went wrong while processing your request.",
        requiresOtp: false,
        verified: false,
      },
      { status: 500 },
    );
  }
}
