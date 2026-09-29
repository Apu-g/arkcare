"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ScanLine, ShieldCheck } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import MaskedText from "@/components/motion/MaskedText";

export default function ScannerPage() {
  const [scannerUrl, setScannerUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SCANNER_URL;

    if (!url) {
      setError("Scanner service is not configured for this environment.");
      setLoading(false);
      return;
    }

    try {
      const parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Unsupported scanner URL");
      }

      if (parsedUrl.hostname.includes("ngrok")) {
        parsedUrl.searchParams.set("ngrok-skip-browser-warning", "true");
      }

      setScannerUrl(parsedUrl.toString());
    } catch {
      setError("Scanner service URL is invalid.");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <main className="px-3 py-4 md:px-5 md:py-5">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        {/* The header is a masthead rule, not a card: the scan viewport below
            is the page's one dominant surface and a boxed header above it
            competed with it for attention. */}
        <Reveal as="header">
          <div className="section-rule mt-0">
            <span>Scanner module</span>
          </div>
          <div className="section-head">
            <MaskedText as="h1" className="section-title">
              ArkCare Scanner
            </MaskedText>
            <div className="flex items-center gap-2">
              <Link
                href="/patient"
                className="nm-btn-secondary"
                aria-label="Back to patient dashboard"
              >
                <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.75} />
                Back
              </Link>
              <span className="status-chip hidden sm:inline-flex">
                <ScanLine className="h-[13px] w-[13px]" strokeWidth={1.75} />
                Capture layer for future verified records
              </span>
            </div>
          </div>
        </Reveal>

        {/* The capture frame. `overflow-hidden` here only rounds the frame's own
            corners so the embedded document clips to them — it is not a scroll
            container and the page still scrolls normally. */}
        <Reveal
          as="section"
          delay={80}
          className="cq-card relative flex min-h-[60vh] flex-col justify-center overflow-hidden"
        >
          {loading ? (
            <div className="m-auto p-10 text-center">
              <div
                className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]"
                aria-hidden="true"
              />
              <p className="text-[13px] text-[var(--text-muted)]" role="status">
                Connecting scanner module…
              </p>
            </div>
          ) : error ? (
            <div className="m-auto max-w-md p-8 text-center">
              <div className="mx-auto mb-5 grid size-14 place-items-center rounded-[18px] bg-[var(--surface-subtle)] shadow-[var(--shadow-inset)]">
                <ShieldCheck
                  className="h-6 w-6 text-[var(--text-muted)]"
                  strokeWidth={1.75}
                />
              </div>
              <h2 className="text-[15px] font-semibold text-[var(--text-strong)]">
                Scanner module offline
              </h2>
              <p className="mt-2 text-[13px] leading-6 text-[var(--text-muted)]">{error}</p>
              <p className="mt-4 text-[12px] text-[var(--text-subtle)]">
                Set NEXT_PUBLIC_SCANNER_URL to attach the external scanning service.
              </p>
            </div>
          ) : (
            <iframe
              src={scannerUrl}
              /* An embedded cross-origin document has no intrinsic height, so
                 the frame itself needs one. This sizes the viewport we hand to
                 the scanner; it is not a scroll container and the page around
                 it still scrolls the document normally. */
              className="h-[78vh] w-full border-0 bg-transparent"
              title="ArkCare Scanner Application"
              allow="camera"
            />
          )}
        </Reveal>
      </div>
    </main>
  );
}
