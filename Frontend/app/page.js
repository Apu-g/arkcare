"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import RoleSelection from "@/components/RoleSelection";
import PixelCareScene from "@/components/carequest/PixelCareScene";
import PixelCharacter from "@/components/carequest/PixelCharacter";
import SimulationBadge from "@/components/carequest/SimulationBadge";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Building2,
  Coins,
  HeartHandshake,
  HeartPulse,
  Network,
  ShieldCheck,
  Stethoscope,
  WalletCards,
} from "lucide-react";

const careLoop = [
  {
    icon: Stethoscope,
    step: "01",
    title: "Clinician approves",
    text: "CareQuest begins from a versioned care plan. AI can draft; the doctor remains the publishing authority.",
  },
  {
    icon: BookOpenCheck,
    step: "02",
    title: "Patient participates",
    text: "Lessons, check-ins, planned follow-ups and suitable activities become a calm guided journey.",
  },
  {
    icon: HeartHandshake,
    step: "03",
    title: "Difficulty becomes care",
    text: "Need Help creates one owned human handoff instead of silently treating a missed task as failure.",
  },
  {
    icon: BarChart3,
    step: "04",
    title: "Hospital learns",
    text: "Operations, rewards and actual payment evidence stay separate so engagement never masquerades as revenue.",
  },
];

const roles = [
  ["Patient", "A gentle mission journey, hospital-specific Capsules, benefits and fast access to human help."],
  ["Doctor", "Versioned care plans, AI draft review, approval authority and clinical escalations without routine noise."],
  ["Care team", "A prioritized handoff queue with ownership, contact history, shift reassignment and resolution."],
  ["Hospital", "Program budgets, engagement, operations, reward liability, finance separation and audit integrity."],
];

export default function Home() {
  const { isLoaded, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !user) return;
    const role = user.publicMetadata?.role;
    if (role === "patient") router.replace("/patient");
    if (role === "doctor") router.replace("/doctor");
    if (role === "nurse" || role === "coordinator") router.replace("/staff");
    if (role === "hospital_admin") router.replace("/admin/carequest");
  }, [isLoaded, user, router]);

  return (
    <main className="min-h-screen">
      {/* ------------------------------------------------------------- nav */}
      <div className="px-4 pt-4 md:px-8">
        <div className="mx-auto max-w-7xl">
          <nav className="cq-card cq-reveal flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="nm-stat-icon">
                <HeartPulse className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </div>
              <div>
                <div className="text-[13px] font-bold tracking-[0.08em] text-[var(--text-strong)]">
                  ARKCARE
                </div>
                <div className="cq-kicker">CareQuest care OS</div>
              </div>
            </div>
            <a href="#enter" className="nm-btn-secondary">
              Enter demo <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </a>
          </nav>
        </div>
      </div>

      {/* ------------------------------------------------------------ hero */}
      <section className="px-4 py-10 md:px-8 lg:py-14">
        <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[1.05fr_.95fr]">
          <div className="cq-reveal">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="cq-pixel-label">Clinician approved</span>
              <span className="cq-pixel-label">Human handoffs</span>
              <SimulationBadge real>Real local EVM</SimulationBadge>
            </div>
            <h1 className="max-w-3xl text-[20px] font-bold leading-tight tracking-[-0.01em] text-[var(--text-strong)] md:text-[26px]">
              Care after the consult, built like a journey.
            </h1>
            <p className="mt-4 max-w-2xl text-[14px] leading-7 text-[var(--text-muted)]">
              ArkCare turns doctor-approved plans into clear missions, rewards honest
              participation with hospital-specific Capsules, and converts patient
              difficulty into real care-team action.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <a href="#enter" className="nm-btn-primary">
                Explore CareQuest <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </a>
              <p className="text-[12px] leading-5 text-[var(--text-muted)]">
                No patient leaderboard. No punishment for honest non-completion.
              </p>
            </div>

            <div className="cq-card-soft mt-6 flex items-center gap-4 p-4 sm:max-w-xl">
              <PixelCharacter variant="guide" mood="wave" size={52} />
              <p className="text-[12px] leading-5 text-[var(--text-muted)]">
                &ldquo;Done&rdquo;, &ldquo;Not done&rdquo; and &ldquo;Need help&rdquo; all
                count as participation. CareQuest rewards communication—not pretending
                everything went well.
              </p>
            </div>
          </div>

          <div className="cq-reveal cq-reveal-delay-1">
            <div className="cq-card p-5">
              <PixelCareScene />
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- care loop */}
      <section className="px-4 pb-12 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <div className="cq-kicker">The care loop</div>
            <h2 className="cq-section-title mt-1">
              Gamification that ends in real healthcare workflow.
            </h2>
          </div>
          <div className="mt-5 nm-grid-3">
            {careLoop.map(({ icon: Icon, step, title, text }, index) => (
              <article
                key={title}
                className={"cq-card p-5 cq-reveal cq-reveal-delay-" + Math.min(index, 3)}
              >
                <div className="flex items-center justify-between">
                  <div className="nm-stat-icon">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-[var(--text-muted)]">
                    {step}
                  </span>
                </div>
                <h3 className="mt-4 nm-card-title text-[14px]">{title}</h3>
                <p className="mt-1.5 text-[12px] leading-5 text-[var(--text-muted)]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- passport */}
      <section className="px-4 pb-12 md:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <div className="cq-kicker">Multi-hospital passport</div>
            <h2 className="cq-section-title mt-1">
              One patient. Separate hospital journeys.
            </h2>
            <p className="mt-2 max-w-xl text-[13px] leading-6 text-[var(--text-muted)]">
              Each hospital controls its own program, budget and benefit catalog.
              Balances stay independent and never imply access to another hospital&apos;s
              clinical records.
            </p>
            <div className="mt-5">
              <PixelCharacter
                variant="walker"
                mood="idle"
                size={72}
                speech="Your care passport keeps every hospital program separate."
              />
            </div>
          </div>

          <div className="nm-grid-2">
            {[
              {
                hospital: "ArkCare City Hospital",
                symbol: "CITY",
                balance: 34,
                missions: 3,
                progress: "68%",
              },
              {
                hospital: "Lotus Heart Institute",
                symbol: "LOTUS",
                balance: 12,
                missions: 1,
                progress: "31%",
              },
            ].map((card) => (
              <article key={card.symbol} className="cq-card cq-card-hover p-5">
                <div className="flex items-center justify-between gap-3">
                  <Building2
                    className="h-[18px] w-[18px] text-[var(--text-muted)]"
                    strokeWidth={1.75}
                  />
                  <span className="cq-pixel-label">{card.symbol}</span>
                </div>
                <h3 className="mt-3 nm-card-title text-[14px]">{card.hospital}</h3>
                <div className="nm-metric-xl mt-3">{card.balance}</div>
                <div className="nm-stat-label">{card.symbol} capsules</div>
                <div className="cq-progress mt-3">
                  <span style={{ width: card.progress }} />
                </div>
                <div className="mt-2 text-[11px] text-[var(--text-muted)]">
                  {card.missions} active mission(s)
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- simulation panel */}
      <section className="px-4 pb-12 md:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[1.05fr_.95fr]">
          <div className="cq-card cq-grid-paper p-5 md:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <SimulationBadge>Simulated device</SimulationBadge>
              <SimulationBadge>Simulated compute</SimulationBadge>
              <SimulationBadge>Simulated market</SimulationBadge>
            </div>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="cq-kicker">Active activity mission</div>
                <h3 className="nm-metric-xl mt-1">3,842 / 5,000 steps</h3>
                <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                  Demo Health Connect · last sync 10:42
                </p>
              </div>
              <PixelCharacter variant="walker" mood="wave" size={68} />
            </div>
            <div className="cq-progress mt-4 !h-2.5">
              <span style={{ width: "76%" }} />
            </div>
            <div className="mt-4 nm-grid-3">
              {[
                ["18.4 H/s", "virtual hash rate"],
                ["1,429", "virtual work units"],
                ["+3 CITY", "Capsules at goal"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-[16px] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)]">
                  <div className="text-[18px] font-bold text-[var(--text-strong)]">
                    {value}
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="cq-kicker">Concept simulation</div>
            <h2 className="cq-section-title mt-1">
              Show the future idea without pretending the phone is mining today.
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-[var(--text-muted)]">
              The demo simulates wearable sync, proof-of-work metrics and external token
              value. The actual CareQuest backend after that boundary—eligibility,
              idempotency, hospital Capsules, budgets, audit and local EVM settlement—is
              implemented as real application logic.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[12px] font-semibold text-[var(--text)]">
              <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={1.75} />
              Real and simulated ledgers remain visibly separate.
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ roles */}
      <section className="px-4 pb-12 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="cq-kicker">Built for every role</div>
          <div className="mt-4 nm-grid-3">
            {roles.map(([title, text], index) => (
              <article key={title} className="cq-card flex gap-3 p-5">
                <span className="font-mono text-[11px] font-semibold text-[var(--text-subtle)]">
                  0{index + 1}
                </span>
                <div>
                  <h3 className="nm-card-title">{title}</h3>
                  <p className="mt-1.5 text-[12px] leading-5 text-[var(--text-muted)]">
                    {text}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- trust boundaries */}
      <section className="px-4 pb-12 md:px-8">
        <div className="mx-auto nm-grid-3 max-w-7xl">
          <article className="cq-card p-5">
            <WalletCards
              className="h-[18px] w-[18px] text-[var(--text-muted)]"
              strokeWidth={1.75}
            />
            <h3 className="mt-3 nm-card-title text-[14px]">Funded patient benefits</h3>
            <p className="mt-1.5 text-[12px] leading-5 text-[var(--text-muted)]">
              Hospital-specific reward budgets and redemptions stay separate from token
              supply and actual consultation payments.
            </p>
          </article>
          <article className="cq-card p-5">
            <Network
              className="h-[18px] w-[18px] text-[var(--text-muted)]"
              strokeWidth={1.75}
            />
            <h3 className="mt-3 nm-card-title text-[14px]">Blockchain with boundaries</h3>
            <p className="mt-1.5 text-[12px] leading-5 text-[var(--text-muted)]">
              Local Solidity/EVM proof rails support Capsules and audit commitments while
              clinical content remains off-chain.
            </p>
          </article>
          <article className="cq-card p-5">
            <Coins
              className="h-[18px] w-[18px] text-[var(--text-muted)]"
              strokeWidth={1.75}
            />
            <h3 className="mt-3 nm-card-title text-[14px]">Economics you can explain</h3>
            <p className="mt-1.5 text-[12px] leading-5 text-[var(--text-muted)]">
              Actual payments, reward costs and simulated compute economics are shown as
              distinct systems instead of one inflated revenue number.
            </p>
          </article>
        </div>
      </section>

      {/* ------------------------------------------------------------ enter */}
      <section id="enter" className="px-4 pb-10 md:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <div className="cq-kicker">Enter the care network</div>
            <h2 className="cq-section-title mt-1">Pick a demo role.</h2>
            <p className="mt-2 text-[13px] leading-6 text-[var(--text-muted)]">
              The seeded demo world lets judges move between the patient journey, clinical
              plan approval, staff handoffs and hospital program analytics.
            </p>
            <div className="mt-4">
              <PixelCharacter
                variant="guide"
                mood="celebrate"
                size={72}
                speech="Ready when you are."
              />
            </div>
          </div>
          <div className="cq-card p-5 md:p-6">
            <RoleSelection />
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] px-4 py-6 text-[11px] text-[var(--text-muted)] md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 sm:flex-row">
          <span>ArkCare · CareQuest 2026</span>
          <span>
            Clinician authority · honest participation · human handoffs · auditable
            rewards
          </span>
        </div>
      </footer>
    </main>
  );
}
