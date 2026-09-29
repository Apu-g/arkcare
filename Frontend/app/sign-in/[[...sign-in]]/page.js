"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, HeartPulse, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import InstantSignIn from "@/components/InstantSignIn";

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
    <main className="flex min-h-screen items-center px-4 py-10 md:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[.9fr_1.1fr]">
        <section className="nm-dark-card hidden min-h-[640px] flex-col justify-between p-8 lg:flex">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[13px] font-semibold text-white/70 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              Back to ArkCare
            </Link>
            <div className="mt-16">
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold text-white/80">
                Session checkpoint
              </span>
              <h1 className="mt-6 text-[34px] font-bold leading-[1.1] tracking-[-0.02em] text-white">
                Resume your
                <span className="text-white/60"> care journey.</span>
              </h1>
              <p className="mt-4 max-w-md text-[13px] leading-relaxed text-[#B7B7BE]">
                Your role, appointments, reports, conversations, and care tools continue
                from one secure session.
              </p>
            </div>
          </div>

          <div className="grid gap-2.5">
            {[
              "Identity-aware dashboards",
              "Private consultation channels",
              "Future reward rails ready",
            ].map((item, index) => (
              <div
                key={item}
                className="flex min-h-12 items-center gap-3 rounded-[14px] bg-white/[.07] px-4 text-[13px] font-medium text-white/85"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-[10px] bg-white/10 text-[11px] font-bold text-white/80">
                  0{index + 1}
                </span>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="cq-card p-5 md:p-8 lg:p-10">
          <div className="mx-auto max-w-md">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-[14px] bg-[var(--primary)] text-white shadow-[0_6px_14px_rgba(16,14,26,0.18)]">
                  <HeartPulse className="h-5 w-5" strokeWidth={2} />
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
              <p className="cq-kicker">Welcome back</p>
              <h2 className="mt-2 text-[22px] font-bold tracking-[-0.01em] text-[var(--text-strong)]">
                Enter your care space
              </h2>
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
                  className="rounded-[14px] border border-[rgba(235,90,90,0.2)] bg-[rgba(235,90,90,0.12)] px-4 py-3 text-[13px] text-[var(--destructive)]"
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
        </section>
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
