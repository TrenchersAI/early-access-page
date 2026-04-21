import { getPrismaClient } from "../../../lib/prisma";

export const runtime = "nodejs";

type WaitlistBody = {
  email?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const prisma = getPrismaClient();
    const body = (await request.json()) as WaitlistBody;
    const email = body.email?.trim().toLowerCase();

    if (!email || !EMAIL_REGEX.test(email)) {
      return Response.json(
        { message: "Please provide a valid email." },
        { status: 400 },
      );
    }

    const existing = await prisma.waitlistSubscriber.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return Response.json(
        { message: "You're already on the waitlist." },
        { status: 200 },
      );
    }

    await prisma.waitlistSubscriber.create({
      data: { email },
    });

    return Response.json(
      { message: "You're in the trenches. Stay ready — alpha drops soon." },
      { status: 201 },
    );
  } catch {
    return Response.json(
      { message: "Something went wrong while saving your email." },
      { status: 500 },
    );
  }
}
