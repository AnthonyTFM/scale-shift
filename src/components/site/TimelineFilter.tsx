"use client";

import { useMemo, useState } from "react";
import { events, eventTypeLabels, statusLabels, type EventType, type TerritoryEvent } from "@/content/events";
import { EventCard } from "@/components/EventCard";
import { formatYear } from "@/lib/eras";

// the list is split into these sections, each with a jump link at the top
const periods = [
  { id: "ancient", label: "Before 500 CE", test: (e: TerritoryEvent) => e.taken < 500 },
  { id: "medieval", label: "500–1499", test: (e: TerritoryEvent) => e.taken >= 500 && e.taken < 1500 },
  { id: "early-modern", label: "1500–1799", test: (e: TerritoryEvent) => e.taken >= 1500 && e.taken < 1800 },
  { id: "modern", label: "1800–1945", test: (e: TerritoryEvent) => e.taken >= 1800 && e.taken <= 1945 },
  { id: "recent", label: "After 1945", test: (e: TerritoryEvent) => e.taken > 1945 },
] as const;

// a long section shows its first few events and folds the rest away; short ones show everything
const FIRST = 6;
const FOLD_OVER = 10;

export function TimelineFilter() {
  const [status, setStatus] = useState<"all" | TerritoryEvent["status"]>("all");
  const [type, setType] = useState<"all" | EventType>("all");
  const [q, setQ] = useState("");
  const [order, setOrder] = useState<"oldest" | "newest">("oldest");

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return events
      .filter((e) => status === "all" || e.status === status)
      .filter((e) => type === "all" || e.type === type)
      .filter((e) => !query || `${e.title} ${e.region} ${e.summary} ${e.polities.join(" ")}`.toLowerCase().includes(query))
      // always chronological (by the year control changed), ties broken by the year it was made official
      .sort((a, b) => (a.taken - b.taken || (a.formalized ?? a.taken) - (b.formalized ?? b.taken)) * (order === "oldest" ? 1 : -1));
  }, [status, type, q, order]);
  const sections = (order === "oldest" ? periods : [...periods].reverse())
    .map((p) => ({ ...p, items: list.filter(p.test) }))
    .filter((p) => p.items.length > 0);
  // while searching or filtering, show every match
  const filtered = q.trim() !== "" || status !== "all" || type !== "all";

  const types = [...new Set(events.map((e) => e.type))];

  return (
    <div>
      <form role="search" onSubmit={(e) => e.preventDefault()} className="card grid gap-3 p-4 md:grid-cols-3">
        <label className="text-sm font-semibold text-ink md:col-span-3">
          Search events
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. Texas, treaty, Poland"
            className="field mt-1"
          />
        </label>
        <label className="text-sm font-semibold text-ink">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="field mt-1">
            <option value="all">Any status</option>
            {Object.entries(statusLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-ink">
          Type
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="field mt-1">
            <option value="all">Any type</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {eventTypeLabels[t]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => {
              setStatus("all");
              setType("all");
              setQ("");
            }}
            className="btn btn-white mb-0 w-full"
          >
            Reset filters
          </button>
        </div>
      </form>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          Showing {list.length} of {events.length} events, {order === "oldest" ? "oldest first" : "newest first"}
        </p>
        <div role="group" aria-label="Order" className="flex rounded-2xl border-2 border-line bg-white p-1 text-sm font-semibold">
          {(
            [
              ["oldest", "Oldest first"],
              ["newest", "Newest first"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={order === id}
              onClick={() => setOrder(id)}
              className="min-h-11 rounded-xl px-3 aria-pressed:bg-primary aria-pressed:text-white"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <nav aria-label="Jump to a period" className="mt-4">
        {/* one row you can swipe on phones, wrapping on wider screens */}
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {sections.map((p) => (
            <li key={p.id} className="shrink-0">
              <a href={`#${p.id}`} className="inline-flex min-h-11 items-center whitespace-nowrap gap-1.5 rounded-full border-2 border-line bg-white px-3.5 text-sm font-semibold text-ink hover:border-primary hover:text-primary">
                {p.label} <span className="font-normal text-muted">{p.items.length}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {sections.map((p) => {
        const fold = !filtered && p.items.length > FOLD_OVER;
        const shown = fold ? p.items.slice(0, FIRST) : p.items;
        const rest = fold ? p.items.slice(FIRST) : [];
        return (
          <section key={p.id} aria-labelledby={`${p.id}-h`} className="mt-10">
            <h2 id={p.id} className="scroll-mt-24 font-display text-2xl text-ink md:text-3xl">
              <span id={`${p.id}-h`}>{p.label}</span>{" "}
              <span className="font-sans text-base font-semibold text-muted">
                {p.items.length} {p.items.length === 1 ? "event" : "events"}
              </span>
            </h2>
            <Events list={shown} />
            {rest.length > 0 ? (
              // a native fold: works without scripts, and the browser's find-in-page opens it
              <details className="group mt-5 sm:ml-24">
                <summary className="btn btn-white w-full cursor-pointer list-none sm:w-auto [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">
                    Show {rest.length} more from {p.label}
                  </span>
                  <span className="hidden group-open:inline">Show fewer</span>
                </summary>
                <div className="sm:-ml-24">
                  <Events list={rest} />
                </div>
              </details>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

/** One column, read top to bottom: a year marker on the line, then the event. */
function Events({ list }: { list: TerritoryEvent[] }) {
  return (
    <ol className="relative mt-5 space-y-5 border-l-2 border-line pl-6 sm:ml-24 sm:pl-8">
      {list.map((ev) => (
        <li key={ev.id} className="relative">
          <span aria-hidden="true" className="absolute -left-[33px] top-6 size-3 rounded-full bg-primary ring-4 ring-paper sm:-left-[41px]" />
          <p className="mb-1 font-display text-lg text-ink sm:absolute sm:-left-36 sm:top-4 sm:mb-0 sm:w-24 sm:text-right">{formatYear(ev.taken, ev.approx)}</p>
          <EventCard ev={ev} headingLevel={3} />
        </li>
      ))}
    </ol>
  );
}
