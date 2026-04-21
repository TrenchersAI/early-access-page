import Link from "next/link";

export const metadata = {
  title: "Terms of Service | TrenchersAI",
  description: "Terms of Service for TrenchersAI.",
};

export default function TermsPage() {
  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-14 text-white sm:px-8">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Terms of Service
      </h1>
      <p className="mt-3 text-sm text-white/70">Last updated: April 21, 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-7 text-white/85 sm:text-base">
        <section>
          <h2 className="text-lg font-medium text-white">1. Acceptance of Terms</h2>
          <p className="mt-2">
            By accessing or using TrenchersAI, you agree to these Terms of
            Service. If you do not agree, please do not use the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white">2. Eligibility</h2>
          <p className="mt-2">
            You must be legally able to enter into a binding agreement in your
            jurisdiction to use this service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white">3. No Financial Advice</h2>
          <p className="mt-2">
            Content and features provided by TrenchersAI are for informational
            purposes only and do not constitute financial, investment, or legal
            advice.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white">4. User Responsibilities</h2>
          <p className="mt-2">
            You are responsible for your own decisions, account security, and
            compliance with applicable laws and regulations.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white">5. Service Availability</h2>
          <p className="mt-2">
            We may modify, suspend, or discontinue parts of the service at any
            time without prior notice.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white">6. Limitation of Liability</h2>
          <p className="mt-2">
            TrenchersAI is provided &quot;as is&quot; without warranties. To the
            maximum extent permitted by law, we are not liable for losses arising
            from use of the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-white">7. Contact</h2>
          <p className="mt-2">
            For questions about these terms, contact us at{" "}
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
