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

/**
 * One credential, presented as a ledger ROW rather than a card. The records
 * here are structurally identical — name, role, email, one action — so a grid of
 * cards was the wrong shape: a ledger makes the whole directory scannable in one
 * column and lets the email sit full-width and selectable instead of clipped
 * inside a narrow tile.
 */
function CredentialRow({ name, subtitle, email, role, symbol, hospitalName, scope }) {
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
    <div className="ledger-row items-start!">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="ledger-title">{name}</span>
          <span className="cq-pixel-label">{subtitle}</span>
          {symbol ? <span className="cq-kicker">{symbol}</span> : null}
        </div>
        {hospitalName ? (
          <p className="ledger-meta mt-0.5">at {hospitalName}</p>
        ) : null}
        <div className="well mt-2 flex items-center gap-2 px-3 py-1.5">
          <code className="min-w-0 flex-1 select-all break-all font-mono text-[12px] leading-5 text-[var(--text)]">
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
        {error ? (
          <p role="alert" className="mt-1 text-[11px] text-[var(--destructive)]">
            {error}
          </p>
        ) : null}
      </div>
      {/* What entering this row actually opens, so the scope is never a
          surprise. It is text, not colour. */}
      <div className="ledger-actions flex-col items-end gap-2">
        <span className="cq-pixel-label">{scope}</span>
        <Button onClick={enter} disabled={busy}>
          {busy ? (
            <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={1.75} />
          ) : (
            <LogIn className="h-[18px] w-[18px]" strokeWidth={1.75} />
          )}
          {busy ? "Entering…" : "Enter dashboard"}
        </Button>
      </div>
    </div>
  );
}

/**
 * The network directory: every hospital admin and every doctor as a one-click
 * entry. Entering a row opens that account's real dashboard (with its isolated
 * hospital scope for admins, or the clinical workspace for doctors). Password
 * for every account is shown for manual login as well.
 */
export default function NetworkAccounts({ accounts }) {
  const [tab, setTab] = useState("hospitals");

  return (
    <div className="nm-stack">
      <Reveal as="section">
        <div className="section-rule">
          <span>Network directory</span>
        </div>
        <div className="section-head">
          <MaskedText as="h1" className="section-title">
            Enter any dashboard
          </MaskedText>
        </div>
        <p className="section-lede">
          One-click into any hospital admin or doctor in the network. Each hospital
          admin sees only their own hospital; each doctor opens their clinical
          workspace. Manual login password for every account:{" "}
          <code className="well inline-block px-1.5 py-0.5 font-mono text-[12px] text-[var(--text-strong)]">
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
        <Reveal>
          <div className="ledger">
            <div className="ledger-head">
              <span>Account</span>
              <span>Scope</span>
            </div>
            {accounts.hospitals.map((hospital) => (
              <CredentialRow
                key={hospital._id}
                name={hospital.name}
                subtitle="Hospital admin"
                email={hospital.adminEmail}
                role="hospital_admin"
                symbol={hospital.symbol}
                scope="This hospital only"
              />
            ))}
            {accounts.platformAdminEmail ? (
              <CredentialRow
                name="ArkCare Network (master)"
                subtitle="Platform admin — every hospital"
                email={accounts.platformAdminEmail}
                role="platform_admin"
                symbol="ALL"
                scope="Every hospital in the network"
              />
            ) : null}
          </div>
        </Reveal>
      ) : (
        <Reveal>
          <div className="ledger">
            <div className="ledger-head">
              <span>Account</span>
              <span>Enter</span>
            </div>
            {accounts.doctors.map((doctor) => (
              <CredentialRow
                key={doctor._id}
                name={doctor.name}
                subtitle={`${doctor.specialization} · ${doctor.experience} yrs`}
                email={doctor.email}
                role="doctor"
                hospitalName={doctor.hospitalName}
                scope="Clinical workspace"
              />
            ))}
          </div>
        </Reveal>
      )}
    </div>
  );
}
