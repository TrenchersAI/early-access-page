import { Resend } from "resend";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

let logoPngPromise: Promise<string> | null = null;

// Renders the white wordmark on a dark rounded-rect badge. Baking the dark
// background into the PNG means no email client (Gmail mobile included) can
// color-shift it during its dark-mode pass.
function getLogoPngBase64() {
  if (logoPngPromise) return logoPngPromise;
  const svgPath = join(process.cwd(), "public/logo.svg");
  logoPngPromise = readFile(svgPath)
    .then(async (svg) => {
      const wordmark = await sharp(svg, { density: 384 })
        .resize({ height: 60 })
        .png()
        .toBuffer();

      const meta = await sharp(wordmark).metadata();
      const wordW = meta.width ?? 260;
      const wordH = meta.height ?? 44;

      const padX = 28;
      const padY = 18;
      const radius = 24;
      const badgeW = wordW + padX * 2;
      const badgeH = wordH + padY * 2;

      const bgSvg = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${badgeW}" height="${badgeH}"><rect width="${badgeW}" height="${badgeH}" rx="${radius}" ry="${radius}" fill="#000000"/></svg>`,
      );

      return sharp(bgSvg)
        .composite([{ input: wordmark, top: padY, left: padX }])
        .png()
        .toBuffer();
    })
    .then((png) => png.toString("base64"))
    .catch((err) => {
      logoPngPromise = null;
      throw err;
    });
  return logoPngPromise;
}

export async function sendWaitlistConfirmationEmail(params: {
  to: string;
  subject?: string;
}) {
  const appName = process.env.WAITLIST_APP_NAME ?? "Trenchers";
  const subject = params.subject ?? `Welcome to ${appName} early access`;

  let html: string | undefined;
  try {
    html = await buildWelcomeEmailHtml();
  } catch (err) {
    console.error(
      "Failed to build welcome email, falling back to simple template:",
      err,
    );
  }

  const result = await sendEmail({
    to: params.to,
    subject,
    heading: html ? undefined : "You're in.",
    body: html
      ? undefined
      : `Thanks for joining the <strong>${appName}</strong> waitlist — we’ll email you when we drop access.`,
    html,
  });

  if ("skipped" in result) {
    return result;
  }

  if (result.error) {
    throw new Error(`Resend send failed: ${result.error.message}`);
  }

  return { ok: true as const, id: result.data?.id ?? null };
}

export async function sendWaitlistOtpEmail(params: {
  to: string;
  otp: string;
}) {
  const appName = process.env.WAITLIST_APP_NAME ?? "Trenchers";
  const subject = `${appName} verification code`;
  let html: string;

  try {
    html = await buildOtpEmailHtml(params.otp);
  } catch {
    // Fallback to simple template if custom HTML template fails to load.
    html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
        <h2 style="margin: 0 0 12px;">Verify your email</h2>
        <p style="margin: 0 0 12px;">
          Use this one-time code to verify your waitlist signup:
          <strong style="font-size: 20px; letter-spacing: 4px;">${params.otp}</strong>.
          The code expires in 10 minutes.
        </p>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          If you didn’t sign up, you can ignore this email.
        </p>
      </div>
    `;
  }

  let logoAttachment: NonNullable<
    Parameters<typeof sendEmail>[0]["attachments"]
  >[number] | undefined;
  try {
    const content = await getLogoPngBase64();
    logoAttachment = {
      filename: "logo.png",
      content,
      contentId: "logo",
      contentType: "image/png",
    };
  } catch (err) {
    console.error("Failed to load OTP email logo attachment:", err);
  }

  const result = await sendEmail({
    to: params.to,
    subject,
    html,
    attachments: logoAttachment ? [logoAttachment] : undefined,
  });

  if ("skipped" in result) {
    return result;
  }

  if (result.error) {
    throw new Error(`Resend send failed: ${result.error.message}`);
  }

  return { ok: true as const, id: result.data?.id ?? null };
}

async function sendEmail(params: {
  to: string;
  subject: string;
  heading?: string;
  body?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentId?: string;
    contentType?: string;
  }>;
}) {
  const resend = getResendClient();
  if (!resend) return { ok: false as const, skipped: true as const };

  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is not set.");
  }

  return resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    attachments: params.attachments,
    html:
      params.html ??
      `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
        <h2 style="margin: 0 0 12px;">${params.heading ?? ""}</h2>
        <p style="margin: 0 0 12px;">
          ${params.body ?? ""}
        </p>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          If you didn’t sign up, you can ignore this email.
        </p>
      </div>
    `,
  });
}

async function buildWelcomeEmailHtml() {
  const templatePath = join(
    process.cwd(),
    "src/email-templates/early-access-hero/index.html",
  );
  const stylesPath = join(
    process.cwd(),
    "src/email-templates/early-access-hero/styles.css",
  );
  const [templateHtml, templateCss] = await Promise.all([
    readFile(templatePath, "utf-8"),
    readFile(stylesPath, "utf-8"),
  ]);

  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.WAITLIST_SITE_URL ??
    "https://trenchers.ai";
  const assetsUrl =
    process.env.EMAIL_ASSETS_URL ??
    "https://assets.trenchers.ai/email-assets";

  return templateHtml
    .replace(
      '<link rel="stylesheet" href="./styles.css" />',
      `<style>${templateCss}</style>`,
    )
    .replace(
      'src="/email-templates/early-access-hero/logo.svg"',
      `src="${assetsUrl}/welcome-logo.png?v=2"`,
    )
    .replace(
      'src="/Low-Poly%20Owl%202.svg"',
      `src="${assetsUrl}/welcome-owl.png?v=2"`,
    )
    .replace(
      'src="/trenchers-component.svg"',
      `src="${assetsUrl}/welcome-component.jpg?v=2"`,
    )
    .replace(/href="\/terms"/g, `href="${appUrl}/terms"`)
    .replace(/href="\/privacy"/g, `href="${appUrl}/privacy"`);
}

async function buildOtpEmailHtml(otp: string) {
  const templatePath = join(
    process.cwd(),
    "src/email-templates/otp-email/index.html",
  );
  const stylesPath = join(
    process.cwd(),
    "src/email-templates/otp-email/styles.css",
  );
  const [templateHtml, templateCss] = await Promise.all([
    readFile(templatePath, "utf-8"),
    readFile(stylesPath, "utf-8"),
  ]);

  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.WAITLIST_SITE_URL ??
    "https://trenchers.ai";
  return templateHtml
    .replace(
      '<link rel="stylesheet" href="./styles.css" />',
      `<style>${templateCss}</style>`,
    )
    .replaceAll("{{OTP_CODE}}", otp)
    .replace(/href="\/terms"/g, `href="${appUrl}/terms"`)
    .replace(/href="\/privacy"/g, `href="${appUrl}/privacy"`);
}
