"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowLeft, HeartPulse, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import MaskedText from "@/components/motion/MaskedText";
import Reveal from "@/components/motion/Reveal";

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) =>
    setForm((previous) => ({ ...previous, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);

    try {
      await signUp({
        name: form.name,
        email: form.email,
        password: form.password,
      });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err.message || "Could not create your account");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "nm-input";

  return (
    <main className="px-4 py-10 md:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[1.05fr_.95fr]">
        <Reveal as="section" className="cq-card p-5 md:p-8 lg:p-10">
          <div className="mx-auto max-w-md">
            <Link
              href="/"
              className="mb-9 inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--text-muted)] transition hover:text-[var(--text-strong)]"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              Back to ArkCare
            </Link>

            <div className="mb-7 flex items-center gap-3 border-b border-[var(--border-subtle)] pb-5">
              <div className="grid size-11 place-items-center rounded-[14px] bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-cta)]">
                <HeartPulse className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <div className="section-rule mt-0">
                  <span>New profile</span>
                </div>
                <MaskedText
                  as="h1"
                  className="mt-2 text-[20px] font-bold tracking-[-0.01em] text-[var(--text-strong)]"
                >
                  Start your ArkCare journey
                </MaskedText>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                ["name", "Full name", "text", "Ada Lovelace", "name"],
                ["email", "Email", "email", "you@example.com", "email"],
                ["password", "Password", "password", "At least 8 characters", "new-password"],
                ["confirmPassword", "Confirm password", "password", "Re-enter password", "new-password"],
              ].map(([field, label, type, placeholder, autoComplete]) => (
                <div key={field}>
                  <label
                    htmlFor={field}
                    className="mb-2 block text-[12px] font-semibold text-[var(--text-strong)]"
                  >
                    {label}
                  </label>
                  <input
                    id={field}
                    name={field}
                    type={type}
                    autoComplete={autoComplete}
                    required
                    minLength={type === "password" ? 8 : undefined}
                    value={form[field]}
                    onChange={update(field)}
                    placeholder={placeholder}
                    className={inputClass}
                  />
                </div>
              ))}

              {error ? (
                <p
                  role="alert"
                  className="rounded-[14px] border border-[var(--destructive)] bg-[var(--destructive-soft)] px-4 py-3 text-[13px] text-[var(--destructive)]"
                >
                  {error}
                </p>
              ) : null}

              <button type="submit" disabled={submitting} className="nm-btn-primary w-full">
                {submitting ? "Creating care profile…" : "Create profile"}
              </button>
            </form>

            <p className="mt-7 text-center text-[13px] text-[var(--text-muted)]">
              Already have a profile?{" "}
              <Link
                href="/sign-in"
                className="font-semibold text-[var(--text-strong)] hover:opacity-70"
              >
                Sign in
              </Link>
            </p>
          </div>
        </Reveal>

        {/* The single ink anchor for this screen. The two setup steps are a
            sequence, so they are numbered rows rather than two more boxes. */}
        <Reveal as="section" delay={90} className="nm-dark-card hidden flex-col justify-between p-8 lg:flex">
          <div>
            <span className="cq-pixel-label bg-white!/10 text-white!/80">
              Journey initialization
            </span>
            <MaskedText
              as="h2"
              lines={["Create identity.", "Choose your path."]}
              className="mt-6 text-[30px] font-bold leading-[1.15] tracking-[-0.02em] text-white"
            />
            <p className="mt-4 max-w-md text-[13px] leading-relaxed text-[#B7B7BE]">
              Your account begins neutral. Next, choose patient or doctor and ArkCare
              provisions the right workspace.
            </p>
          </div>

          <ol className="grid gap-4">
            <li className="border-b border-white/10 pb-4">
              <div className="flex items-center justify-between">
                <Activity className="h-5 w-5 text-white/80" strokeWidth={1.75} />
                <span className="cq-kicker text-white!/60">Step 01</span>
              </div>
              <h3 className="mt-3 font-semibold text-white">Identity</h3>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
                <span className="block h-full w-[34%] rounded-full bg-white/80" />
              </div>
            </li>
            <li>
              <div className="flex items-center justify-between">
                <Sparkles className="h-5 w-5 text-white/80" strokeWidth={1.75} />
                <span className="cq-kicker text-white!/60">Step 02</span>
              </div>
              <h3 className="mt-3 font-semibold text-white">Role + care experience</h3>
              <p className="mt-2 text-[12px] leading-relaxed text-white/60">
                Unlocked immediately after registration.
              </p>
            </li>
          </ol>
        </Reveal>
      </div>
    </main>
  );
}
