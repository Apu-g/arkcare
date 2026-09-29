"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Reveal from "@/components/motion/Reveal";
import MaskedText from "@/components/motion/MaskedText";
import { Search, Stethoscope, Video } from "lucide-react";

/**
 * Browse every approved doctor grouped by their niche (specialty), so a patient
 * can enter a specialty and meet a clinician. Booking a slot from a niche card
 * starts the real consultation flow; the video meeting itself happens in the
 * appointment chat (that is where the shared chat + Agora token live).
 */
export default function DoctorDirectory({ doctors, organizationName }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter((d) =>
      [d.name, d.specialization, d.category, ...(d.qualifications || [])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [doctors, query]);

  const byNiche = useMemo(() => {
    const groups = new Map();
    for (const doctor of filtered) {
      const niche = doctor.category || doctor.specialization || "General";
      if (!groups.has(niche)) groups.set(niche, []);
      groups.get(niche).push(doctor);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <div className="nm-stack">
      <Reveal as="section" className="cq-card p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="cq-kicker">Doctor directory</div>
            <MaskedText
              as="h1"
              className="mt-2 text-[20px] font-bold leading-tight tracking-[-0.01em] text-[var(--text-strong)]"
            >
              Meet a clinician by niche
            </MaskedText>
            <p className="mt-1 max-w-xl text-[13px] leading-6 text-[var(--text-muted)]">
              Every approved doctor at {organizationName || "this hospital"}. Enter a
              niche, then book a slot to open a video consultation.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--text-subtle)]"
              strokeWidth={1.75}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search doctor or niche"
              aria-label="Search doctor or niche"
              className="nm-input !pl-10"
            />
          </div>
        </div>
      </Reveal>

      {byNiche.length === 0 ? (
        <div className="cq-card border-dashed p-8 text-center text-[13px] text-[var(--text-muted)]">
          No doctors match &ldquo;{query}&rdquo;.
        </div>
      ) : null}

      {byNiche.map(([niche, list]) => (
        <Reveal as="section" key={niche} className="nm-stack-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Stethoscope
              className="h-[18px] w-[18px] text-[var(--text-muted)]"
              strokeWidth={1.75}
            />
            <h2 className="cq-section-title">{niche}</h2>
            <span className="cq-pixel-label">{list.length} doctor(s)</span>
          </div>
          <div className="nm-grid-3">
            {list.map((doctor) => (
              <article key={doctor.doctor_id} className="cq-card cq-card-hover flex flex-col p-4">
                <div className="flex items-start gap-3">
                  <div className="nm-stat-icon shrink-0">
                    <Stethoscope className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="nm-card-title truncate text-[14px]">{doctor.name}</h3>
                    <p className="text-[12px] font-semibold text-[var(--text-muted)]">
                      {doctor.specialization}
                    </p>
                    {doctor.experience ? (
                      <p className="text-[11px] text-[var(--text-subtle)]">
                        {doctor.experience} yrs experience
                      </p>
                    ) : null}
                  </div>
                </div>
                {doctor.qualifications?.length ? (
                  <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-[var(--text-muted)]">
                    {doctor.qualifications.join(" · ")}
                  </p>
                ) : null}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="cq-pixel-label">
                    {doctor.consultationFee ? `₹${doctor.consultationFee}` : "—"}
                  </span>
                  <Button
                    onClick={() => {
                      window.location.href = "/patient?tab=find-doctors";
                    }}
                  >
                    <Video className="h-[18px] w-[18px]" strokeWidth={1.75} /> Book
                    &amp; meet
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </Reveal>
      ))}

      <p className="text-center text-[12px] text-[var(--text-muted)]">
        Booking a slot creates your appointment; open it from{" "}
        <Link href="/patient" className="font-semibold text-[var(--text-strong)] underline underline-offset-4">
          My Appointments
        </Link>{" "}
        and press the video button to start a secure call.
      </p>
    </div>
  );
}
