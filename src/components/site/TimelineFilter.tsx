"use client";

import { useMemo, useState } from "react";
import { events, eventTypeLabels, statusLabels, type EventType, type TerritoryEvent } from "@/content/events";
import { EventCard } from "@/components/EventCard";
import { formatYear } from "@/lib/eras";

const periods = [
  { id: "all", label: "All periods", test: () => true },
  { id: "ancient", label: "Before 500 CE", test: (e: TerritoryEvent) => e.taken < 500 },
  { id: "medieval", label: "500–1499", test: (e: TerritoryEvent) => e.taken >= 500 && e.taken < 1500 },
  { id: "early-modern", label: "1500–1799", test: (e: TerritoryEvent) => e.taken >= 1500 && e.taken < 1800 },
  { id: "modern", label: "1800–1945", test: (e: TerritoryEvent) => e.taken >= 1800 && e.taken <= 1945 },
  { id: "recent", label: "After 1945", test: (e: TerritoryEvent) => e.taken > 1945 },
] as const;

export function TimelineFilter() {
  const [period, setPeriod] = useState<(typeof periods)[number]["id"]>("all");
  const [status, setStatus] = useState<"all" | TerritoryEvent["status"]>("all");
  const [type, setType] = useState<"all" | EventType>("all");
  const [q, setQ] = useState("");
  const [order, setOrder] = useState<"oldest" | "newest">("oldest");

  const list = useMemo(() => {
    const p = periods.find((x) => x.id === period)!;
    const query = q.trim().toLowerCase();
    return events
      .filter(p.test)
      .filter((e) => status === "all" || e.status === status)
      .filter((e) => type === "all" || e.type === type)
      .filter((e) => !query || `${e.title} ${e.region} ${e.summary} ${e.polities.join(" ")}`.toLowerCase().includes(query))
      // always chronological (by the year control changed), ties broken by the year it was made official
      .sort((a, b) => (a.taken - b.taken || (a.formalized ?? a.taken) - (b.formalized ?? b.taken)) * (order === "oldest" ? 1 : -1));
  }, [period, status, type, q, order]);

  const types = [...new Set(events.map((e) => e.type))];

  return (
    <div>
      <form role="search" onSubmit={(e) => e.preventDefault()} className="card grid gap-3 p-4 md:grid-cols-4">
        <label className="text-sm font-semibold text-ink md:col-span-4">
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
          Period
          <select value={period} onChange={(e) => setPeriod(e.target.value as typeof period)} className="field mt-1">
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
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
              setPeriod("all");
              setStatus("all");
              setType("all");
              setQ("");
            }}
            className="btn btn-white w-full"
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
      {/* one column, read top to bottom: a year marker on the line, then the event */}
      <ol className="relative mt-6 space-y-5 border-l-2 border-line pl-6 sm:ml-24 sm:pl-8">
        {list.map((ev) => (
          <li key={ev.id} className="relative">
            <span aria-hidden="true" className="absolute -left-[33px] top-6 size-3 rounded-full bg-primary ring-4 ring-paper sm:-left-[41px]" />
            <p className="mb-1 font-display text-lg text-ink sm:absolute sm:-left-36 sm:top-4 sm:mb-0 sm:w-24 sm:text-right">
              {formatYear(ev.taken, ev.approx)}
            </p>
            <EventCard ev={ev} headingLevel={2} />
          </li>
        ))}
      </ol>
    </div>
  );
}
