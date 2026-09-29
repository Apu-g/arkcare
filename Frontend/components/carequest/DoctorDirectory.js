"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Reveal from "@/components/motion/Reveal";
import MaskedText from "@/components/motion/MaskedText";
import { Search, Stethoscope, Video } from "lucide-react";

/**
 * Browse every approved doctor grouped by their niche (specialty), so a patient
 * can enter a specialty and meet a clinician. Booking a slot from a niche row
 * starts the real consultation flow; the video meeting itself happens in the
 * appointment chat (that is where the shared chat + Agora token live).
 *
 * A doctor is a distinct entity, but within one niche they are structurally
 * identical records — name, specialty, experience, fee, one action. Three
 * boxed cards per row made a directory of thirty doctors read as ninety
 * unrelated objects, so each niche is a ledger: one hairline row per doctor
 * with the booking action in `.ledger-actions`, and the page frame is
 * editorial (rule, heading, lede, search in the head) rather than a card.
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
      <Reveal as="section">
        <div className="section-rule">
          <span>Doctor directory</span>
        </div>
        <div className="section-head">
          <MaskedText as="h1" className="section-title">
            Meet a clinician by niche
          </MaskedText>
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
              className="nm-input pl-10!"
            />
          </div>
        </div>
        <p className="section-lede">
          Every approved doctor at {organizationName || "this hospital"}. Enter a niche,
          then book a slot to open a video consultation.
        </p>
        <dl className="stat-strip mt-4">
          <div className="stat-inline">
            <dt>Approved doctors</dt>
            <dd>{doctors.length}</dd>
          </div>
          <div className="stat-inline">
            <dt>Matching your search</dt>
            <dd>{filtered.length}</dd>
          </div>
          <div className="stat-inline">
            <dt>Specialties</dt>
            <dd>{byNiche.length}</dd>
          </div>
        </dl>
      </Reveal>

      {byNiche.length === 0 ? (
        <p className="border-l-2 border-[var(--border)] pl-3 text-[13px] text-[var(--text-muted)]">
          No doctors match &ldquo;{query}&rdquo;.
        </p>
      ) : null}

      {byNiche.map(([niche, list]) => (
        <Reveal as="section" key={niche} className="nm-stack-sm">
          <div className="section-rule">
            <span className="inline-flex items-center gap-2">
              <Stethoscope className="h-[14px] w-[14px]" strokeWidth={1.75} />
              {niche}
            </span>
          </div>
          <div className="section-head">
            <h2 className="section-title">
              {list.length} clinician{list.length === 1 ? "" : "s"} in this niche
            </h2>
          </div>

          <div className="ledger">
            <div className="ledger-head">
              <span>Clinician</span>
              <span>Consultation</span>
            </div>
            {list.map((doctor) => (
              <article key={doctor.doctor_id} className="ledger-row items-start!">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="nm-stat-icon shrink-0">
                    <Stethoscope className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="ledger-title">{doctor.name}</h3>
                    <p className="ledger-meta mt-0.5">
                      {doctor.specialization}
                      {doctor.experience ? ` · ${doctor.experience} yrs experience` : ""}
                    </p>
                    {doctor.qualifications?.length ? (
                      <p className="ledger-meta mt-1">{doctor.qualifications.join(" · ")}</p>
                    ) : null}
                  </div>
                </div>

                <div className="ledger-actions flex-col items-end gap-2">
                  {/* A fee is a value: it reads on the near-opaque data surface,
                      never behind the primary blur. */}
                  <span className="well px-2.5 py-1 text-[12px] font-semibold text-[var(--text-strong)]">
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
