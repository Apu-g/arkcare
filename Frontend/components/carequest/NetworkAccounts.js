"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Check,
  Copy,
  Loader2,
  LogIn,
  Stethoscope,
} from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import MaskedText from "@/components/motion/MaskedText";
import { instantEnterAs } from "@/actions/demoEntryActions";

function destinationFor(role) {
  if (role === "doctor") return "/doctor";
  if (role === "platform_admin") return "/admin/platform";
  return "/admin/hospital"; // hospital_admin
}

function CredentialCard({ name, subtitle, email, role, symbol, hospitalName }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function enter() {
    setBusy(true);
    setError("");
    try {
      await instantEnterAs(email);
      router.push(destinationFor(role));
      router.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <article className="cq-card flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="nm-card-title truncate text-[14px]">{name}</h3>
          <p className="truncate text-[12px] text-[var(--text-muted)]">{subtitle}</p>
        </div>
        {symbol ? <span className="cq-pixel-label">{symbol}</span> : null}
      </div>

      <div className="glass-data mt-3 flex items-center justify-between gap-2 rounded-[14px] px-3 py-2">
        <code className="truncate font-mono text-[11px] text-[var(--text)]">
          {email}
        </code>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={copy}
          title="Copy email"
          aria-label={"Copy email for " + name}
        >
          {copied ? (
            <Check className="h-[15px] w-[15px] text-[var(--success)]" strokeWidth={1.75} />
          ) : (
            <Copy className="h-[15px] w-[15px]" strokeWidth={1.75} />
          )}
        </Button>
      </div>
      {copied ? (
        <p className="mt-1 text-[11px] text-[var(--success)]">Email copied</p>
      ) : null}

      {hospitalName ? (
        <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">at {hospitalName}</p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-1.5 text-[11px] text-[var(--destructive)]">
          {error}
        </p>
      ) : null}

      <Button className="mt-3 w-full" onClick={enter} disabled={busy}>
        {busy ? (
          <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={1.75} />
        ) : (
          <LogIn className="h-[18px] w-[18px]" strokeWidth={1.75} />
        )}
        {busy ? "Entering…" : "Enter dashboard"}
      </Button>
    </article>
  );
}

/**
 * The network directory: every hospital admin and every doctor as a one-click
 * card. Entering a card opens that account's real dashboard (with its isolated
 * hospital scope for admins, or the clinical workspace for doctors). Password
 * for every account is shown for manual login as well.
 */
export default function NetworkAccounts({ accounts }) {
  const [tab, setTab] = useState("hospitals");

  return (
    <div className="nm-stack">
      <Reveal as="section" className="cq-card p-5 md:p-6">
        <div className="cq-kicker">Network directory</div>
        <MaskedText
          as="h1"
          className="mt-3 text-[20px] font-bold leading-tight tracking-[-0.01em] text-[var(--text-strong)]"
        >
          Enter any dashboard
        </MaskedText>
        <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[var(--text-muted)]">
          One-click into any hospital admin or doctor in the network. Each hospital
          admin sees only their own hospital; each doctor opens their clinical
          workspace. Manual login password for every account:{" "}
          <code className="glass-data inline-block rounded-[8px] px-1.5 py-0.5 font-mono text-[12px] text-[var(--text-strong)]">
            {accounts.demoPassword}
          </code>
        </p>
      </Reveal>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-active={tab === "hospitals"}
          aria-pressed={tab === "hospitals"}
          onClick={() => setTab("hospitals")}
          className="nm-pill inline-flex min-h-10 items-center gap-1.5"
        >
          <Building2 className="h-[15px] w-[15px]" strokeWidth={1.75} /> Hospitals (
          {accounts.hospitals.length})
        </button>
        <button
          type="button"
          data-active={tab === "doctors"}
          aria-pressed={tab === "doctors"}
          onClick={() => setTab("doctors")}
          className="nm-pill inline-flex min-h-10 items-center gap-1.5"
        >
          <Stethoscope className="h-[15px] w-[15px]" strokeWidth={1.75} /> Doctors (
          {accounts.doctors.length})
        </button>
      </div>

      {tab === "hospitals" ? (
        <Reveal className="nm-grid-3">
          {accounts.hospitals.map((hospital) => (
            <CredentialCard
              key={hospital._id}
              name={hospital.name}
              subtitle="Hospital admin"
              email={hospital.adminEmail}
              role="hospital_admin"
              symbol={hospital.symbol}
            />
          ))}
          {accounts.platformAdminEmail ? (
            <CredentialCard
              name="ArkCare Network (master)"
              subtitle="Platform admin — every hospital"
              email={accounts.platformAdminEmail}
              role="platform_admin"
              symbol="ALL"
            />
          ) : null}
        </Reveal>
      ) : (
        <Reveal className="nm-grid-3">
          {accounts.doctors.map((doctor) => (
            <CredentialCard
              key={doctor._id}
              name={doctor.name}
              subtitle={`${doctor.specialization} · ${doctor.experience} yrs`}
              email={doctor.email}
              role="doctor"
              hospitalName={doctor.hospitalName}
            />
          ))}
        </Reveal>
      )}
    </div>
  );
}
