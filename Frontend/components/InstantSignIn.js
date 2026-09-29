"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ClipboardList, Loader2, Stethoscope, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Reveal from "@/components/motion/Reveal";
import { instantSignInAs } from "@/actions/demoAuthActions";

export default function InstantSignIn({ compact = false }) {
  const router = useRouter();
  const { refresh } = useAuth();
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");

  const signInAs = async (role) => {
    setError("");
    setPending(role);
    try {
      await instantSignInAs(role);
      await refresh();
      const homes = {
        patient: "/patient",
        doctor: "/doctor",
        nurse: "/staff",
        coordinator: "/staff",
        hospital_admin: "/admin/carequest",
      };
      router.push(homes[role] || "/");
      router.refresh();
    } catch (err) {
      setError(err.message || "Could not start the demo session");
      setPending(null);
    }
  };

  const buttonClass = "nm-btn-secondary";

  /* Judge access only ever opens a real, isolated demo session — the copy
     states that so a viewer is never misled about the data behind it. */
  const entries = [
    ["patient", UserRound, "Demo Patient", "Patient journey"],
    ["doctor", Stethoscope, "Demo Doctor", "Clinical workspace"],
    ["nurse", ClipboardList, "Demo Nurse", "Handoff queue"],
    ["hospital_admin", Building2, "Demo Hospital Admin", "Program and audit"],
  ];

  return (
    <div className={compact ? "" : "mt-4"}>
      {!compact ? (
        <p className="mb-3 text-center text-[12px] text-[var(--text-muted)]">
          Synthetic judge accounts only.
        </p>
      ) : null}
      {/* A short list of equivalent actions reads as a ledger of roles, not a
          grid of identical cards. Each row says where it lands, so a judge
          knows what they are opening before they press the button. */}
      <Reveal>
        <div className="ledger">
          <div className="ledger-head">
            <span>Role</span>
            <span>Opens</span>
          </div>
          {entries.map(([role, Icon, label, lands]) => (
            <div key={role} className="ledger-row">
              <div className="flex items-center gap-2.5">
                <Icon
                  className="h-[18px] w-[18px] shrink-0 text-[var(--celadon)]"
                  strokeWidth={1.75}
                />
                <span className="ledger-title">{label}</span>
              </div>
              <div className="ledger-actions gap-2">
                <span className="cq-pixel-label">{lands}</span>
                <button
                  type="button"
                  onClick={() => signInAs(role)}
                  disabled={pending !== null}
                  className={buttonClass}
                >
                  {pending === role ? (
                    <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={1.75} />
                  ) : null}
                  {pending === role ? "Starting…" : "Enter"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-[14px] border border-[var(--destructive)] bg-[var(--destructive-soft)] px-3 py-2 text-[13px] text-[var(--destructive)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
