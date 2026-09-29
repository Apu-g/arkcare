"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

function initials(name) {
  if (!name) return "?";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Replaces Clerk's `<UserButton />` — shows the signed-in account and a sign-out
 * action, styled to match the dashboards.
 */
export default function UserMenu() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex min-h-10 items-center gap-2 rounded-[14px] border border-[var(--glass-edge)] bg-[var(--glass-1)] px-2 py-1.5 shadow-[var(--shadow-card),inset_0_1px_0_var(--glass-edge-strong)] backdrop-blur-[20px] saturate-[150%] transition hover:shadow-[var(--shadow-hover),inset_0_1px_0_var(--glass-edge-strong)]"
      >
        <span className="grid size-8 place-items-center rounded-full bg-[var(--primary)] text-[11px] font-semibold text-[var(--primary-foreground)]">
          {initials(user.fullName)}
        </span>
        <span className="hidden max-w-[10rem] truncate text-[13px] font-semibold text-[var(--text-strong)] sm:block">
          {user.fullName}
        </span>
      </button>

      {/* The dropdown is a dark floating surface in both palettes, so it stays
          legible on any surface it opens over. Colours are literal here on
          purpose: this surface is intentionally outside the token scope. */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-[16px] border border-white/10 bg-[#15151C] shadow-[var(--shadow-dark-float)]"
        >
          <div className="border-b border-white/10 px-4 py-3">
            <p className="truncate text-[13px] font-semibold text-white">
              {user.fullName}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-[#B7B7BE]">
              {user.primaryEmailAddress?.emailAddress}
            </p>
            {user.publicMetadata?.role && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold capitalize text-white/90">
                <UserIcon className="h-3 w-3" strokeWidth={2} />
                {user.publicMetadata.role}
              </span>
            )}
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex min-h-[42px] w-full items-center gap-2 px-4 text-[13px] font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
