"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import RoleSelection from "@/components/RoleSelection";
import Reveal from "@/components/motion/Reveal";
import MaskedText from "@/components/motion/MaskedText";
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
    <main>
      {/* ------------------------------------------------------------- nav */}
      <div className="px-4 pt-4 md:px-8">
        <div className="mx-auto max-w-7xl">
          <nav className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
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
            <a href="#enter" className="nm-btn-primary">
              Enter demo <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </a>
          </nav>
        </div>
      </div>

      {/* ------------------------------------------------------------ hero */}
      <section className="px-4 py-10 md:px-8 lg:py-14">
        <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[1.05fr_.95fr]">
          <Reveal>
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="cq-pixel-label">Clinician approved</span>
              <span className="cq-pixel-label">Human handoffs</span>
              <SimulationBadge real>Real local EVM</SimulationBadge>
            </div>
            {/* First-paint moment only. MaskedText is a pure CSS transition
                driven by one data-attribute flip, so it cannot replay. */}
            <MaskedText
              as="h1"
              lines={["Care after the consult,", "built like a journey."]}
              className="max-w-3xl text-[20px] font-bold leading-tight tracking-[-0.01em] text-[var(--text-strong)] md:text-[26px]"
            />
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

            <div className="mt-6 flex items-center gap-4 border-t border-[var(--border-subtle)] pt-5 sm:max-w-xl">
              <PixelCharacter variant="guide" mood="wave" size={52} />
              <p className="text-[12px] leading-5 text-[var(--text-muted)]">
                &ldquo;Done&rdquo;, &ldquo;Not done&rdquo; and &ldquo;Need help&rdquo; all
                count as participation. CareQuest rewards communication—not pretending
                everything went well.
              </p>
            </div>
          </Reveal>

          {/* The scene is the hero's one picture, so it keeps the one card on
              this screen — everything else is document structure. */}
          <Reveal delay={90}>
            <div className="cq-card p-5">
              <PixelCareScene />
            </div>
          </Reveal>
        </div>
      </section>

      {/* -------------------------------------------------------- care loop
          A sequence, so it reads as numbered steps down a rule rather than
          four tiles in a row. */}
      <Reveal as="section" className="px-4 pb-12 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="section-rule">
            <span>The care loop</span>
          </div>
          <div className="section-head">
            <MaskedText
              as="h2"
              className="section-title"
              lines={["Gamification that ends in", "real healthcare workflow."]}
            />
          </div>
          <div className="mt-2 grid gap-0">
            {careLoop.map(({ icon: Icon, step, title, text }) => (
              <article
                key={title}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 border-b border-[var(--border-subtle)] py-5 last:border-b-0 md:grid-cols-[auto_14rem_minmax(0,1fr)]"
              >
                <span className="nm-stat-icon shrink-0">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="cq-kicker">{step}</span>
                    <h3 className="nm-card-title text-[14px]">{title}</h3>
                  </div>
                </div>
                <p className="col-start-2 text-[12px] leading-5 text-[var(--text-muted)] md:col-start-3">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </Reveal>

      {/* --------------------------------------------------------- passport */}
      <Reveal as="section" className="px-4 pb-12 md:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <div className="section-rule">
              <span>Multi-hospital passport</span>
            </div>
            <MaskedText
              as="h2"
              className="section-title"
              lines={["One patient. Separate", "hospital journeys."]}
            />
            <p className="section-lede mt-2">
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

          {/* A hospital program is a distinct entity, but these are a
              comparison pair, not a set of separate actions — so they read as
              two quiet data wells rather than two raised cards. Two boxes, not
              a row of six. */}
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
              <article key={card.symbol} className="well p-5">
                <div className="flex items-center justify-between gap-3">
                  <Building2
                    className="h-[18px] w-[18px] text-[var(--text-muted)]"
                    strokeWidth={1.75}
                  />
                  <span className="cq-pixel-label">{card.symbol}</span>
                </div>
                <h3 className="mt-3 nm-card-title text-[14px]">{card.hospital}</h3>
                {/* A capsule balance is a value: it reads on the near-opaque
                    data surface, never behind the primary blur. */}
                <div className="mt-3">
                  <div className="nm-metric-xl text-[26px] tabular-nums">{card.balance}</div>
                  <div className="nm-stat-label">{card.symbol} capsules</div>
                  <div className="cq-progress mt-3">
                    <span style={{ width: card.progress }} />
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-[var(--text-muted)]">
                  {card.missions} active mission(s)
                </div>
              </article>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ------------------------------------------------- simulation panel
          The single ink anchor for the marketing page: this is where the
          simulated layer is labelled, so it earns the weight. */}
      <Reveal as="section" className="px-4 pb-12 md:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[1.05fr_.95fr]">
          <div data-scope="ink" className="nm-dark-card cq-grid-paper p-5 md:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <SimulationBadge>Simulated device</SimulationBadge>
              <SimulationBadge>Simulated compute</SimulationBadge>
              <SimulationBadge>Simulated market</SimulationBadge>
            </div>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--glass-hairline)] pb-4">
              <div>
                <div className="cq-kicker">Active activity mission</div>
                <h3 className="nm-metric-xl mt-1">3,842 / 5,000 steps</h3>
                <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                  Demo Health Connect · last sync 10:42
                </p>
              </div>
              <PixelCharacter variant="walker" mood="wave" size={68} />
            </div>
            <div className="cq-progress mt-4 h-2!">
              <span style={{ width: "76%" }} />
            </div>
            <dl className="stat-strip mt-5">
              <div className="stat-inline">
                <dt>Virtual hash rate</dt>
                <dd>18.4 H/s</dd>
              </div>
              <div className="stat-inline">
                <dt>Virtual work units</dt>
                <dd>1,429</dd>
              </div>
              <div className="stat-inline">
                <dt>Capsules at goal</dt>
                <dd>+3 CITY</dd>
              </div>
            </dl>
          </div>

          <div>
            <div className="section-rule">
              <span>Concept simulation</span>
            </div>
            <MaskedText
              as="h2"
              className="section-title"
              lines={["Show the future idea without", "pretending the phone is mining today."]}
            />
            <p className="section-lede mt-2">
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
      </Reveal>

      {/* ------------------------------------------------------------ roles */}
      <Reveal as="section" className="px-4 pb-12 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="section-rule">
            <span>Built for every role</span>
          </div>
          <div className="section-head">
            <h2 className="section-title">One platform, four working surfaces.</h2>
            <p className="section-lede">
              Every role gets its own console over the same hospital-scoped record.
            </p>
          </div>
          <div className="grid gap-0 md:grid-cols-2 md:gap-x-10">
            {roles.map(([title, text], index) => (
              <article
                key={title}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 border-b border-[var(--border-subtle)] py-4"
              >
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
      </Reveal>

      {/* ------------------------------------------------- trust boundaries
          Three claims, so a ledger of them: they are assertions about the
          product, not entities the user can act on. */}
      <Reveal as="section" className="px-4 pb-12 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="section-rule">
            <span>Trust boundaries</span>
          </div>
          <div className="section-head">
            <h2 className="section-title">What is real, and where the line is.</h2>
            <p className="section-lede">
              Three claims the product is willing to be measured against.
            </p>
          </div>
          <div className="grid gap-0 md:grid-cols-3 md:gap-x-10">
            {[
              [
                WalletCards,
                "Funded patient benefits",
                "Hospital-specific reward budgets and redemptions stay separate from token supply and actual consultation payments.",
              ],
              [
                Network,
                "Blockchain with boundaries",
                "Local Solidity/EVM proof rails support Capsules and audit commitments while clinical content remains off-chain.",
              ],
              [
                Coins,
                "Economics you can explain",
                "Actual payments, reward costs and simulated compute economics are shown as distinct systems instead of one inflated revenue number.",
              ],
            ].map(([Icon, title, text]) => (
              <article
                key={title}
                className="border-b border-[var(--border-subtle)] py-4 md:border-b-0"
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className="h-[18px] w-[18px] text-[var(--text-muted)]"
                    strokeWidth={1.75}
                  />
                  <h3 className="nm-card-title text-[14px]">{title}</h3>
                </div>
                <p className="mt-1.5 text-[12px] leading-5 text-[var(--text-muted)]">
                  {text}
                </p>
                {title === "Blockchain with boundaries" ? (
                  /* Proof gets the copper tone, never celadon. */
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--copper-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--copper)]">
                    <ShieldCheck className="h-3 w-3" strokeWidth={1.75} />
                    Verification &amp; provenance
                  </span>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ------------------------------------------------------------ enter
          The role cards inside RoleSelection are the actionable entities, so
          this section hands the whole column over to them. */}
      <Reveal as="section" id="enter" className="px-4 pb-10 md:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <div className="section-rule">
              <span>Enter the care network</span>
            </div>
            <h2 className="section-title">Pick a demo role.</h2>
            <p className="section-lede mt-2">
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
          {/* No wrapper card: the two role cards below ARE the action targets,
              and boxing them again stacked three surfaces deep. */}
          <div>
            <RoleSelection />
          </div>
        </div>
      </Reveal>

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
