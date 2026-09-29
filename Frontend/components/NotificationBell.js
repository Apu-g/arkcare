"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import {
  getMyNotifications,
  getMyUnreadNotificationCount,
  markMyNotificationsRead,
} from "@/actions/appointmentActions";

const POLL_MS = 30000;
const MAX_BADGE = 99;

function relativeTime(value) {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/* Sparse semantic accents (design spec §22). The type name is always shown
   alongside, so colour is never the only signal. */
/* Sparse semantic accents. The type name is always shown alongside, so colour
   is never the only signal. */
const TYPE_ACCENT = {
  appointment_booked: "bg-[var(--success-soft)] text-[var(--success)]",
  appointment_completed: "bg-[var(--info-soft)] text-[var(--info)]",
  appointment_cancelled: "bg-[var(--warning-soft)] text-[var(--warning)]",
  report_published: "bg-[var(--copper-soft)] text-[var(--copper)]",
  carequest_alert: "bg-[var(--destructive-soft)] text-[var(--destructive)]",
};

/**
 * Unread-notification bell.
 *
 * The DB is the source of truth and this polls it; Pusher (when configured) is
 * only a nudge that triggers the same poll. So a dropped socket, a Pusher
 * outage, or a page opened later all converge on the same correct list.
 */
export default function NotificationBell({ pollMs = POLL_MS }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const containerRef = useRef(null);
  const pusherChannelRef = useRef(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [items, count] = await Promise.all([
        getMyNotifications(15),
        getMyUnreadNotificationCount(),
      ]);
      setNotifications(Array.isArray(items) ? items : []);
      setUnread(Number(count) || 0);
    } catch (error) {
      console.error("Could not load notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Lightweight live refresh. Poll first so the bell is correct even with no
  // Pusher configuration at all.
  useEffect(() => {
    const timer = setInterval(() => load({ silent: true }), pollMs);
    return () => clearInterval(timer);
  }, [load, pollMs]);

  // Optional live nudge from the server. subscribe() throws synchronously when
  // Pusher is unconfigured, so it is guarded and the poll carries the load.
  useEffect(() => {
    let cancelled = false;
    let client = null;

    (async () => {
      try {
        const [{ pusherClient }, { getSessionPayload }] = await Promise.all([
          import("@/lib/pusher"),
          import("@/lib/session"),
        ]);

        const payload = await getSessionPayload();
        if (!payload?.sub || cancelled) return;

        client = pusherClient;
        // The per-user channel the Pusher auth endpoint authorizes.
        const channel = pusherClient.subscribe(
          "private-carequest-user-" + payload.sub
        );
        pusherChannelRef.current = channel;
        channel.bind("notification.created", () => load({ silent: true }));
      } catch (error) {
        // Realtime unavailable — the poll above still delivers everything.
      }
    })();

    return () => {
      cancelled = true;
      const channel = pusherChannelRef.current;
      pusherChannelRef.current = null;
      if (!channel || !client) return;
      try {
        client.unsubscribe(channel.name);
      } catch {
        // ignore
      }
    };
  }, [load]);

  // Close the dropdown on an outside click.
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const handleToggle = () => setOpen((previous) => !previous);

  const handleMarkAllRead = async () => {
    setMarking(true);
    try {
      await markMyNotificationsRead();
      await load({ silent: true });
    } catch (error) {
      console.error("Could not mark notifications as read:", error);
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
        aria-expanded={open}
        className="relative flex size-10 items-center justify-center rounded-[14px] border border-[var(--glass-edge)] bg-[var(--glass-1)] text-[var(--text)] shadow-[var(--shadow-card),inset_0_1px_0_var(--glass-edge-strong)] backdrop-blur-[20px] saturate-[150%] transition hover:shadow-[var(--shadow-hover),inset_0_1px_0_var(--glass-edge-strong)]"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--destructive)] px-1 text-[10px] font-bold text-white">
            {unread > MAX_BADGE ? `${MAX_BADGE}+` : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-[20px] border border-[var(--glass-edge)] bg-[var(--surface)] shadow-[var(--shadow-hover),inset_0_1px_0_var(--glass-edge-strong)]">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--glass-1)] px-4 py-3">
            <span className="text-[13px] font-semibold text-[var(--text-strong)]">
              Notifications
            </span>
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={marking || unread === 0}
              className="flex min-h-10 items-center gap-1.5 rounded-[12px] px-2.5 text-[12px] font-semibold text-[var(--success)] transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {marking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
              ) : (
                <Check className="h-3.5 w-3.5" strokeWidth={2} />
              )}
              Mark all read
            </button>
          </div>

          {/* JUSTIFIED SCROLL CONTAINER: this is a transient popover, not page
              content. It must not grow the document or push the shell around
              when there are many notifications, and the document is not the
              element being scrolled here. Same justification as a dialog body. */}
          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-[var(--text-muted)]">
                Loading notifications…
              </p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-[var(--text-muted)]">
                You are all caught up.
              </p>
            ) : (
              /* Notifications are a chronological record list, so they read as
                 a ledger: hairline-separated rows, not stacked boxes. Read
                 state is dimmed AND carries the word "read" below, so it never
                 depends on opacity alone. */
              <div className="ledger">
                {notifications.map((item) => (
                  <div
                    key={item._id}
                    className={
                      "border-b border-[var(--border-subtle)] px-4 py-3 last:border-b-0 " +
                      (item.readAt ? "opacity-70" : "")
                    }
                  >
                    <div className="flex items-start gap-2">
                      {!item.readAt && (
                        <span
                          className="mt-1.5 size-2 shrink-0 rounded-full bg-[var(--info)]"
                          aria-hidden="true"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] font-semibold text-[var(--text-strong)]">
                            {item.title}
                          </p>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              TYPE_ACCENT[item.type] ||
                              "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                            }`}
                          >
                            {String(item.type || "").replace(/_/g, " ")}
                          </span>
                        </div>
                        {item.body && (
                          <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-muted)]">
                            {item.body}
                          </p>
                        )}
                        <p className="mt-1 text-[10px] text-[var(--text-subtle)]">
                          {relativeTime(item.createdAt)}
                          {item.readAt ? " · read" : " · unread"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
