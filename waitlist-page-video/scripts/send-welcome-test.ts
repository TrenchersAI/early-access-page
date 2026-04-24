import {
  sendWaitlistConfirmationEmail,
  sendWaitlistOtpEmail,
} from "../src/lib/email";

const to = process.argv[2] ?? "harsh2102agarwal@gmail.com";
const mode = process.argv[3] ?? "welcome";

async function main() {
  if (mode === "otp") {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`Sending OTP email to ${to} with code ${otp}...`);
    const result = await sendWaitlistOtpEmail({ to, otp });
    console.log("Result:", result);
    return;
  }

  console.log(`Sending welcome email to ${to}...`);
  const result = await sendWaitlistConfirmationEmail({ to });
  console.log("Result:", result);
}

main().catch((err) => {
  console.error("Send failed:", err);
  process.exit(1);
});
