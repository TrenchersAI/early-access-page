import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | TrenchersAI",
  description: "Privacy Policy for TrenchersAI.",
};

export default function PrivacyPage() {
  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-14 text-white sm:px-8">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-3 text-sm text-white/70">Last updated: April 21, 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-7 text-white/85 sm:text-base">
        <section>
          <h2 className="text-lg font-medium text-white">1. Information We Collect</h2>
          <p className="mt-2">
            We may collect information you provide directly, such as your email
            address when joining the waitlist.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white">2. How We Use Information</h2>
          <p className="mt-2">
            We use collected information to operate and improve the service,
            communicate updates, and provide support.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white">3. Data Sharing</h2>
          <p className="mt-2">
            We do not sell your personal information. We may share data with
            service providers that help us run the platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white">4. Data Security</h2>
          <p className="mt-2">
            We use reasonable safeguards to protect data, but no method of
            transmission or storage is completely secure.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white">5. Your Choices</h2>
          <p className="mt-2">
            You may request access, correction, or deletion of your personal
            information by contacting us.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white">6. Policy Updates</h2>
          <p className="mt-2">
            We may update this policy from time to time. The latest version will
            always be posted on this page.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white">7. Contact</h2>
          <p className="mt-2">
            For privacy questions, contact us at{" "}
            <a
              className="underline underline-offset-2 hover:text-white"
              href="mailto:support@trenchers.ai"
            >
              support@trenchers.ai
            </a>
            .
          </p>
        </section>
      </div>

      <div className="mt-10">
        <Link
          href="/"
          className="inline-flex rounded-full border border-white/30 px-4 py-2 text-sm font-medium text-white transition hover:border-white/60 hover:bg-white/10"
        >
          Back to Home
        </Link>
      </div>
    </section>
  );
}
