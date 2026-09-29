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

  const buttonClass = "nm-btn-secondary w-full";

  /* Judge access only ever opens a real, isolated demo session — the copy
     states that so a viewer is never misled about the data behind it. */
  const entries = [
    ["patient", UserRound, "Demo Patient"],
    ["doctor", Stethoscope, "Demo Doctor"],
    ["nurse", ClipboardList, "Demo Nurse"],
    ["hospital_admin", Building2, "Demo Hospital Admin"],
  ];

  return (
    <div className={compact ? "" : "mt-4"}>
      {!compact ? (
        <p className="mb-3 text-center text-[12px] text-[var(--text-muted)]">
          Synthetic judge accounts only.
        </p>
      ) : null}
      <Reveal className="grid gap-2 sm:grid-cols-2">
        {entries.map(([role, Icon, label]) => (
          <button
            key={role}
            type="button"
            onClick={() => signInAs(role)}
            disabled={pending !== null}
            className={buttonClass}
          >
            {pending === role ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={1.75} />
            ) : (
              <Icon className="h-[18px] w-[18px] text-[var(--celadon)]" strokeWidth={1.75} />
            )}
            {pending === role ? "Starting…" : label}
          </button>
        ))}
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
