"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, HeartPulse, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import InstantSignIn from "@/components/InstantSignIn";
import MaskedText from "@/components/motion/MaskedText";
import Reveal from "@/components/motion/Reveal";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const next = searchParams.get("next") || "/";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await signIn(email, password);
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err.message || "Could not sign you in");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "nm-input";

  return (
    <main className="px-4 py-10 md:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[.9fr_1.1fr]">
        {/* The single ink anchor for this screen: the trust/framing half. The
            form column stays on the light clinical base. */}
        <Reveal as="section" className="nm-dark-card hidden flex-col justify-between p-8 lg:flex">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[13px] font-semibold text-white/70 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              Back to ArkCare
            </Link>
            <div className="mt-16">
              <span className="cq-pixel-label bg-white!/10 text-white!/80">
                Session checkpoint
              </span>
              <MaskedText
                as="h1"
                lines={["Resume your", "care journey."]}
                className="mt-6 text-[30px] font-bold leading-[1.15] tracking-[-0.02em] text-white"
              />
              <p className="mt-4 max-w-md text-[13px] leading-relaxed text-[#B7B7BE]">
                Your role, appointments, reports, conversations, and care tools continue
                from one secure session.
              </p>
            </div>
          </div>

          <ol className="grid gap-2.5">
            {[
              "Identity-aware dashboards",
              "Private consultation channels",
              "Future reward rails ready",
            ].map((item, index) => (
              <li
                key={item}
                className="flex min-h-12 items-center gap-3 border-b border-white/10 pb-2.5 text-[13px] font-medium text-white/85 last:border-b-0"
              >
                <span className="font-mono text-[11px] font-bold text-white/60">
                  0{index + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal as="section" delay={90} className="cq-card p-5 md:p-8 lg:p-10">
          <div className="mx-auto max-w-md">
            {/* The identity strip is a masthead, not another box: a rule, the
                wordmark and the gateway label. */}
            <div className="mb-7 flex items-center justify-between border-b border-[var(--border-subtle)] pb-5">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-[14px] bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-cta)]">
                  <HeartPulse className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-[var(--text-strong)]">
                    ArkCare
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">Identity gateway</div>
                </div>
              </div>
              <ShieldCheck
                className="h-5 w-5 text-[var(--text-subtle)]"
                strokeWidth={1.75}
              />
            </div>

            <div className="mb-7">
              <div className="section-rule mt-0">
                <span>Welcome back</span>
              </div>
              <MaskedText
                as="h2"
                className="mt-2 text-[20px] font-bold tracking-[-0.01em] text-[var(--text-strong)]"
              >
                Enter your care space
              </MaskedText>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-muted)]">
                Use your account or jump into the hackathon demo below.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-[12px] font-semibold text-[var(--text-strong)]"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-[12px] font-semibold text-[var(--text-strong)]"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                />
              </div>

              {error ? (
                <p
                  role="alert"
                  className="rounded-[14px] border border-[var(--destructive)] bg-[var(--destructive-soft)] px-4 py-3 text-[13px] text-[var(--destructive)]"
                >
                  {error}
                </p>
              ) : null}

              <button type="submit" disabled={submitting} className="nm-btn-primary w-full">
                {submitting ? "Opening session…" : "Continue to ArkCare"}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
              <span className="h-px flex-1 bg-[var(--border)]" />
              Judge access
              <span className="h-px flex-1 bg-[var(--border)]" />
            </div>

            <InstantSignIn compact />

            <p className="mt-7 text-center text-[13px] text-[var(--text-muted)]">
              New to ArkCare?{" "}
              <Link
                href="/sign-up"
                className="font-semibold text-[var(--text-strong)] hover:opacity-70"
              >
                Create an account
              </Link>
            </p>

            <div className="mt-7 flex items-center justify-center gap-2 text-[11px] text-[var(--text-subtle)]">
              <Sparkles className="h-3 w-3" strokeWidth={1.75} />
              Hackathon demo profiles contain synthetic demo data only.
            </div>
          </div>
        </Reveal>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
