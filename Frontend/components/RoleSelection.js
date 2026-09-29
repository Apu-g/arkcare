"use client";

import { ArrowRight, ShieldCheck, Sparkles, Stethoscope, Users } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import { setUserRole } from "@/actions/userActions";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import InstantSignIn from "@/components/InstantSignIn";

const PENDING_ROLE_KEY = "arkcare:pendingRole";

const roles = [
  {
    id: "patient",
    icon: Users,
    label: "Patient path",
    description: "Care Passport, missions, hospital Capsules, benefits and your approved care journey.",
    tags: ["CareQuest", "Appointments", "Reports"],
  },
  {
    id: "doctor",
    icon: Stethoscope,
    label: "Doctor path",
    description: "Appointments, versioned care plans, AI draft review and clinical escalations.",
    tags: ["Care plans", "Approval", "Escalations"],
  },
];

export default function RoleSelection() {
  const { isLoaded, isSignedIn, refresh } = useAuth();
  const [loading, setLoading] = useState(null);
  const router = useRouter();

  const applyRole = async (role) => {
    setLoading(role);
    try {
      const result = await setUserRole(role);
      await refresh();
      if (result?.needsOnboarding) router.push("/doctor/onboarding");
      else router.push(role === "doctor" ? "/doctor" : "/patient");
    } catch (error) {
      console.error("Error setting role:", error);
    } finally {
      setLoading(null);
    }
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn || loading) return;
    const pendingRole = window.localStorage.getItem(PENDING_ROLE_KEY);
    if (!pendingRole) return;
    window.localStorage.removeItem(PENDING_ROLE_KEY);
    applyRole(pendingRole);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  const handleRoleSelection = async (role) => {
    if (!isSignedIn) {
      const currentUser = await refresh();
      if (currentUser) {
        await applyRole(role);
        return;
      }
      window.localStorage.setItem(PENDING_ROLE_KEY, role);
      router.push("/sign-in?next=%2F");
      return;
    }
    await applyRole(role);
  };

  return (
    <div className="grid gap-4">
      <Reveal className="nm-grid-2">
        {roles.map(({ id, icon: Icon, label, description, tags }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleRoleSelection(id)}
            disabled={loading !== null}
            className="cq-card cq-card-hover group flex flex-col p-5 text-left disabled:opacity-60"
          >
            <div className="flex items-start justify-between">
              <div className="nm-stat-icon">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </div>
              <ArrowRight
                className="h-[18px] w-[18px] text-[var(--text-subtle)] transition group-hover:translate-x-0.5 group-hover:text-[var(--text-strong)]"
                strokeWidth={1.75}
              />
            </div>

            <h3 className="mt-4 text-[15px] font-semibold text-[var(--text-strong)]">
              {label}
            </h3>
            <p className="mt-1.5 text-[12px] leading-5 text-[var(--text-muted)]">
              {description}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => <span key={tag} className="cq-pixel-label">{tag}</span>)}
            </div>
            <div className="mt-4 flex items-center gap-2 text-[12px] font-semibold text-[var(--text)]">
              {loading === id ? (
                <><Sparkles className="h-[15px] w-[15px] animate-pulse" strokeWidth={1.75} /> Preparing…</>
              ) : (
                <><ShieldCheck className="h-[15px] w-[15px]" strokeWidth={1.75} /> {isSignedIn ? "Continue" : "Sign in to continue"}</>
              )}
            </div>
          </button>
        ))}
      </Reveal>

      <Reveal className="cq-card-soft p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-[15px] w-[15px] text-[var(--text-muted)]" strokeWidth={1.75} />
          <span className="cq-kicker">One-click judge demo</span>
        </div>
        <InstantSignIn compact />
      </Reveal>
    </div>
  );
}
