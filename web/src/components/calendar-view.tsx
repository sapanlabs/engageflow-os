"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  CONTENT_STATUS_COLORS,
  CAL_EVENT_COLORS,
  CAL_EVENT_LABELS,
  CAL_EVENT_TYPES,
} from "@/lib/constants";

export type CalEvent = {
  id: string;
  title: string;
  date: string; // ISO start
  end?: string | null; // ISO end (optional)
  allDay?: boolean;
  type: string; // CalEventType
  status?: string; // for CONTENT coloring
  href: string;
  subtitle?: string;
};

type View = "month" | "week" | "day" | "agenda";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_H = 44; // px per hour in week/day time grid
const DAY_START = 7; // first visible hour
const DAY_END = 22; // last visible hour (inclusive-ish)

function eventColor(e: CalEvent): string {
  if (e.type === CAL_EVENT_TYPES.CONTENT && e.status) return CONTENT_STATUS_COLORS[e.status] ?? "#6b6b6b";
  return CAL_EVENT_COLORS[e.type] ?? "#6b6b6b";
}
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const sameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b);
function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (x.getDay() + 6) % 7; // Monday-first
  x.setDate(x.getDate() - offset);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function CalendarView({ events, defaultView = "month" }: { events: CalEvent[]; defaultView?: View }) {
  const [view, setView] = useState<View>(defaultView);
  const [cursor, setCursor] = useState(() => new Date());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const today = new Date();

  const visibleEvents = useMemo(() => events.filter((e) => !hidden.has(e.type)), [events, hidden]);

  function toggleType(t: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  }

  function navigate(dir: -1 | 0 | 1) {
    if (dir === 0) return setCursor(new Date());
    setCursor((c) => {
      if (view === "month") return new Date(c.getFullYear(), c.getMonth() + dir, 1);
      if (view === "week") return addDays(c, dir * 7);
      if (view === "day") return addDays(c, dir);
      return addDays(c, dir * 14); // agenda pages by fortnight
    });
  }

  const rangeLabel = useMemo(() => {
    if (view === "month") return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(cursor);
    if (view === "day") return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(cursor);
    if (view === "week") {
      const s = startOfWeek(cursor);
      const e = addDays(s, 6);
      const fmt = (d: Date) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
      return `${fmt(s)} – ${fmt(e)}, ${e.getFullYear()}`;
    }
    return "Upcoming";
  }, [view, cursor]);

  return (
    <div className="flex flex-col gap-3">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <NavBtn onClick={() => navigate(-1)}>←</NavBtn>
          <NavBtn onClick={() => navigate(0)}>Today</NavBtn>
          <NavBtn onClick={() => navigate(1)}>→</NavBtn>
        </div>
        <p className="font-display text-2xl">{rangeLabel}</p>

        <div className="ml-auto flex items-center gap-1 rounded-[var(--radius-input)] border p-0.5">
          {(["month", "week", "day", "agenda"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-[calc(var(--radius-input)-2px)] px-3 py-1.5 text-sm capitalize transition",
                view === v ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "text-[var(--muted)] hover:text-[var(--fg)]",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* legend / filters */}
      <div className="flex flex-wrap items-center gap-2">
        {Object.values(CAL_EVENT_TYPES).map((t) => {
          const off = hidden.has(t);
          return (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition",
                off ? "opacity-40" : "hover:bg-[var(--surface-2)]",
              )}
              title={off ? `Show ${CAL_EVENT_LABELS[t]}` : `Hide ${CAL_EVENT_LABELS[t]}`}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CAL_EVENT_COLORS[t] }} />
              {CAL_EVENT_LABELS[t]}
            </button>
          );
        })}
      </div>

      {view === "month" && <MonthGrid cursor={cursor} events={visibleEvents} today={today} onPickDay={(d) => { setCursor(d); setView("day"); }} />}
      {view === "week" && <TimeGrid days={weekDays(cursor)} events={visibleEvents} today={today} />}
      {view === "day" && <TimeGrid days={[new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())]} events={visibleEvents} today={today} />}
      {view === "agenda" && <AgendaList cursor={cursor} events={visibleEvents} today={today} />}
    </div>
  );
}

function weekDays(cursor: Date): Date[] {
  const s = startOfWeek(cursor);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
}

function NavBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-[var(--radius-input)] border px-3 py-1.5 text-sm hover:bg-[var(--surface-2)]">
      {children}
    </button>
  );
}

// ---------------- Month ----------------
function MonthGrid({ cursor, events, today, onPickDay }: { cursor: Date; events: CalEvent[]; today: Date; onPickDay: (d: Date) => void }) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const byDay = groupByDay(events);

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-[var(--radius-card)] border bg-[var(--border)]">
      {WEEKDAYS.map((w) => (
        <div key={w} className="bg-[var(--surface)] px-2 py-2 text-xs font-medium text-[var(--muted)]">{w}</div>
      ))}
      {cells.map((d, i) => {
        const dayEvents = d ? byDay.get(dayKey(d)) ?? [] : [];
        const shown = dayEvents.slice(0, 3);
        const extra = dayEvents.length - shown.length;
        return (
          <div key={d ? dayKey(d) : `x${i}`} className="min-h-28 bg-[var(--bg)] p-1.5">
            {d && (
              <>
                <button
                  onClick={() => onPickDay(d)}
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    sameDay(d, today) ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "text-[var(--muted)] hover:bg-[var(--surface-2)]",
                  )}
                >
                  {d.getDate()}
                </button>
                <div className="mt-1 flex flex-col gap-1">
                  {shown.map((e) => <EventPill key={e.id} e={e} />)}
                  {extra > 0 && (
                    <button onClick={() => onPickDay(d)} className="px-1.5 text-left text-[11px] text-[var(--muted)] hover:text-[var(--fg)]">
                      +{extra} more
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EventPill({ e }: { e: CalEvent }) {
  const color = eventColor(e);
  return (
    <Link
      href={e.href}
      className="flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[11px] leading-tight"
      style={{ backgroundColor: `${color}1f`, color }}
      title={`${e.title}${e.subtitle ? " · " + e.subtitle : ""}`}
    >
      {!e.allDay && <span className="shrink-0 tabular-nums opacity-70">{fmtTime(new Date(e.date))}</span>}
      <span className="truncate">{e.title}</span>
    </Link>
  );
}

// ---------------- Week / Day time grid ----------------
function TimeGrid({ days, events, today }: { days: Date[]; events: CalEvent[]; today: Date }) {
  const hours: number[] = [];
  for (let h = DAY_START; h <= DAY_END; h++) hours.push(h);
  const byDay = groupByDay(events);

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border">
      {/* day headers */}
      <div className="flex border-b bg-[var(--surface)]">
        <div className="w-14 shrink-0" />
        {days.map((d) => (
          <div key={dayKey(d)} className="flex-1 border-l px-2 py-2 text-center">
            <span className="text-xs text-[var(--muted)]">{new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(d)}</span>{" "}
            <span className={cn("ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-sm", sameDay(d, today) ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "")}>
              {d.getDate()}
            </span>
          </div>
        ))}
      </div>

      {/* all-day row */}
      <div className="flex border-b bg-[var(--bg)]">
        <div className="flex w-14 shrink-0 items-center justify-end px-1 py-1 text-[10px] text-[var(--muted)]">all-day</div>
        {days.map((d) => {
          const allDayEv = (byDay.get(dayKey(d)) ?? []).filter((e) => e.allDay);
          return (
            <div key={dayKey(d)} className="min-h-8 flex-1 border-l p-1">
              <div className="flex flex-col gap-1">{allDayEv.map((e) => <EventPill key={e.id} e={e} />)}</div>
            </div>
          );
        })}
      </div>

      {/* time grid */}
      <div className="relative max-h-[62dvh] overflow-y-auto">
        <div className="flex">
          {/* hour gutter */}
          <div className="w-14 shrink-0">
            {hours.map((h) => (
              <div key={h} className="relative border-b" style={{ height: HOUR_H }}>
                <span className="absolute -top-2 right-1 text-[10px] text-[var(--muted)]">{fmtHour(h)}</span>
              </div>
            ))}
          </div>
          {/* day columns */}
          {days.map((d) => {
            const timed = (byDay.get(dayKey(d)) ?? []).filter((e) => !e.allDay);
            return (
              <div key={dayKey(d)} className="relative flex-1 border-l">
                {hours.map((h) => <div key={h} className="border-b" style={{ height: HOUR_H }} />)}
                {timed.map((e) => {
                  const start = new Date(e.date);
                  const startPos = (start.getHours() + start.getMinutes() / 60 - DAY_START) * HOUR_H;
                  const durMin = e.end ? Math.max(30, (new Date(e.end).getTime() - start.getTime()) / 60000) : 45;
                  const height = Math.max(22, (durMin / 60) * HOUR_H);
                  const color = eventColor(e);
                  if (startPos < -HOUR_H) return null;
                  return (
                    <Link
                      key={e.id}
                      href={e.href}
                      className="absolute left-1 right-1 overflow-hidden rounded-[6px] border-l-2 px-1.5 py-0.5 text-[11px] leading-tight"
                      style={{ top: Math.max(0, startPos), height, backgroundColor: `${color}1f`, color, borderColor: color }}
                      title={`${fmtTime(start)} · ${e.title}`}
                    >
                      <span className="block truncate font-medium">{e.title}</span>
                      <span className="block truncate opacity-70">{fmtTime(start)}{e.subtitle ? ` · ${e.subtitle}` : ""}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------- Agenda ----------------
function AgendaList({ cursor, events, today }: { cursor: Date; events: CalEvent[]; today: Date }) {
  const start = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
  const end = addDays(start, 14);
  const inRange = events
    .filter((e) => {
      const d = new Date(e.date);
      return d >= start && d < end;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const byDay = groupByDay(inRange);
  const orderedKeys = [...byDay.keys()];

  if (inRange.length === 0) {
    return <div className="rounded-[var(--radius-card)] border border-dashed p-10 text-center text-sm text-[var(--muted)]">Nothing scheduled in this range.</div>;
  }

  return (
    <div className="flex flex-col divide-y rounded-[var(--radius-card)] border">
      {orderedKeys.map((k) => {
        const list = byDay.get(k)!;
        const d = new Date(list[0].date);
        return (
          <div key={k} className="flex gap-4 p-4">
            <div className="w-24 shrink-0">
              <p className={cn("text-sm font-medium", sameDay(d, today) && "text-[var(--accent)]")}>
                {new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(d)}
              </p>
              <p className="text-2xl font-display">{d.getDate()}</p>
              <p className="text-xs text-[var(--muted)]">{new Intl.DateTimeFormat("en-US", { month: "short" }).format(d)}</p>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {list.map((e) => {
                const color = eventColor(e);
                return (
                  <Link key={e.id} href={e.href} className="flex items-center gap-2.5 rounded-[var(--radius-input)] px-2 py-1.5 hover:bg-[var(--surface-2)]">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span className="w-14 shrink-0 text-xs tabular-nums text-[var(--muted)]">{e.allDay ? "All day" : fmtTime(new Date(e.date))}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{e.title}</span>
                    {e.subtitle && <span className="hidden truncate text-xs text-[var(--muted)] sm:block">{e.subtitle}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------- helpers ----------------
function groupByDay(events: CalEvent[]): Map<string, CalEvent[]> {
  const m = new Map<string, CalEvent[]>();
  for (const e of events) {
    const k = dayKey(new Date(e.date));
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(e);
  }
  for (const list of m.values()) list.sort((a, b) => Number(!!b.allDay) - Number(!!a.allDay) || new Date(a.date).getTime() - new Date(b.date).getTime());
  return m;
}
function fmtTime(d: Date): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(d);
}
function fmtHour(h: number): string {
  const period = h < 12 ? "am" : "pm";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${period}`;
}
