"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  BookOpenCheck,
  Building2,
  ClipboardList,
  FileCheck2,
  HeartPulse,
  Home,
  Menu,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  X,
  WalletCards,
} from "lucide-react";
import UserMenu from "@/components/UserMenu";
import PixelCharacter from "@/components/carequest/PixelCharacter";
import CapsuleGauge from "@/components/carequest/CapsuleGauge";
import NeedHelpButton from "@/components/carequest/NeedHelpButton";

const NAV = {
  patient: [
    { href: "/patient", label: "Home", icon: Home },
    { href: "/patient/doctors", label: "Doctors", icon: Stethoscope },
    { href: "/patient/hospitals", label: "Hospitals", icon: Building2 },
    { href: "/patient/carequest", label: "CareQuest", icon: Sparkles },
    { href: "/patient/care-plans", label: "Care plan", icon: BookOpenCheck },
    { href: "/network", label: "Network", icon: Users },
  ],
  doctor: [
    { href: "/doctor", label: "Practice", icon: Stethoscope },
    { href: "/doctor/care-plans", label: "Care plans", icon: BookOpenCheck },
    { href: "/doctor/escalations", label: "Handoffs", icon: ClipboardList },
    { href: "/network", label: "Network", icon: Users },
  ],
  staff: [
    { href: "/staff", label: "Handoffs", icon: ClipboardList },
    { href: "/network", label: "Network", icon: Users },
  ],
  admin: [
    { href: "/admin/hospital", label: "My hospital", icon: Building2 },
    { href: "/admin/carequest", label: "Program", icon: BarChart3 },
    { href: "/admin/carequest/audit", label: "Audit", icon: ShieldCheck },
    { href: "/network", label: "Network", icon: Users },
  ],
  platform_admin: [
    { href: "/admin/platform", label: "Network", icon: Building2 },
    { href: "/network", label: "Directory", icon: Users },
  ],
};

const ROLE_META = {
  patient: { label: "Patient journey", variant: "guide" },
  doctor: { label: "Clinical workspace", variant: "doctor" },
  staff: { label: "Care operations", variant: "nurse" },
  admin: { label: "Hospital program", variant: "guardian" },
  platform_admin: { label: "Platform network", variant: "guardian" },
};

function isActive(pathname, href) {
  if (pathname === href) return true;
  // Only treat a path as a section when the link is not a bare dashboard root,
  // otherwise every child route highlights "Home".
  if (href === "/patient" || href === "/doctor") return false;
  return pathname.startsWith(href);
}

function NavLinks({ links, pathname, onNavigate }) {
  return (
    <nav className="space-y-1.5" aria-label="Main navigation">
      {links.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className="cq-nav-link"
            data-active={active ? "true" : "false"}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ meta, compact = false }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-[14px] px-1 py-1">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-[var(--primary)] text-white shadow-[0_6px_14px_rgba(16,14,26,0.18)]">
        <HeartPulse className="h-5 w-5" strokeWidth={2} />
      </div>
      {compact ? null : (
        <div className="min-w-0">
          <div className="truncate text-[13px] font-bold tracking-[0.08em] text-[var(--text-strong)]">
            ARKCARE
          </div>
          <div className="truncate text-[10px] font-medium text-[var(--text-subtle)]">
            {meta.label}
          </div>
        </div>
      )}
    </Link>
  );
}

export default function CareQuestShell({
  role = "patient",
  title = "CareQuest",
  subtitle = "",
  children,
  actions = null,
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const links = NAV[role] || NAV.patient;
  const meta = ROLE_META[role] || ROLE_META.patient;
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="cq-app-shell flex h-full min-h-screen flex-col lg:grid lg:grid-cols-[236px_1fr]">
      {/* ------------------------------------------------ desktop sidebar (spec §8) */}
      <aside className="cq-sidebar hidden lg:flex lg:h-full lg:flex-col">
        <div className="flex h-full flex-col gap-6 overflow-y-auto p-5">
          <Brand meta={meta} />

          <div className="rounded-[20px] bg-[var(--surface-subtle)] p-3 shadow-[var(--shadow-card)]">
            <PixelCharacter
              variant={meta.variant}
              mood="wave"
              size={52}
              speech={meta.label}
            />
          </div>

          <NavLinks links={links} pathname={pathname} />

          <div className="mt-auto rounded-[20px] bg-[var(--surface-subtle)] p-3.5 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-[var(--text-strong)]">
              <WalletCards className="h-4 w-4" strokeWidth={1.75} />
              Capsule programs
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Hospital-specific balances stay separate from clinical decisions.
            </p>
            {role === "patient" ? (
              <Link
                href="/reports"
                className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-strong)] hover:opacity-70"
              >
                <FileCheck2 className="h-3 w-3" strokeWidth={2} /> Reports
              </Link>
            ) : null}
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------ mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-[#100E1A]/30"
            onClick={closeDrawer}
          />
          <div className="cq-sidebar absolute inset-y-0 left-0 flex w-[264px] flex-col gap-6 overflow-y-auto p-5 shadow-[0_24px_60px_rgba(16,14,26,0.2)]">
            <div className="flex items-center justify-between">
              <Brand meta={meta} />
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Close navigation"
                className="grid size-9 place-items-center rounded-[12px] text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavLinks links={links} pathname={pathname} onNavigate={closeDrawer} />
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------ main column */}
      <div className="flex min-w-0 flex-col lg:h-full">
        <header className="cq-topbar z-30 shrink-0">
          <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation"
                className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow-card)] lg:hidden"
              >
                <Menu className="h-[18px] w-[18px]" />
              </button>
              <div className="min-w-0">
                <div className="cq-kicker">{meta.label}</div>
                <h1 className="truncate text-[18px] font-bold leading-tight tracking-[-0.01em] text-[var(--text-strong)] md:text-[20px]">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="hidden truncate text-[12px] text-muted-foreground sm:block">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {actions}
              {role === "patient" ? <CapsuleGauge /> : null}
              {role === "patient" ? <NeedHelpButton /> : null}
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Desktop: the shell frame owns the scroll, so the rounded frame, sidebar
            and header stay visible (spec §7.2). */}
        <div className="ark-scroll px-4 py-5 md:px-7 md:py-7">{children}</div>
      </div>
    </div>
  );
}
