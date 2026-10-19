"use client";

import { useMemo, useState } from "react";
import { events, eventTypeLabels, statusLabels, type EventType, type TerritoryEvent } from "@/content/events";
import { EventCard } from "@/components/EventCard";

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

  const list = useMemo(() => {
    const p = periods.find((x) => x.id === period)!;
    const query = q.trim().toLowerCase();
    return events
      .filter(p.test)
      .filter((e) => status === "all" || e.status === status)
      .filter((e) => type === "all" || e.type === type)
      .filter((e) => !query || `${e.title} ${e.region} ${e.summary} ${e.polities.join(" ")}`.toLowerCase().includes(query))
      .sort((a, b) => a.taken - b.taken);
  }, [period, status, type, q]);

  const types = [...new Set(events.map((e) => e.type))];

  return (
    <div>
      <form role="search" onSubmit={(e) => e.preventDefault()} className="grid gap-3 rounded-card border border-line bg-white p-4 md:grid-cols-4">
        <label className="text-sm font-semibold text-ink md:col-span-4">
          Search events
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. Texas, treaty, Poland"
            className="mt-1 h-11 w-full rounded-lg border border-line px-3 font-normal"
          />
        </label>
        <label className="text-sm font-semibold text-ink">
          Period
          <select value={period} onChange={(e) => setPeriod(e.target.value as typeof period)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-2 font-normal">
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-ink">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-2 font-normal">
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
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-2 font-normal">
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
            className="h-11 w-full rounded-lg border border-line font-semibold hover:bg-paper"
          >
            Reset filters
          </button>
        </div>
      </form>
      <p className="mt-4 text-sm text-muted" aria-live="polite">
        Showing {list.length} of {events.length} events
      </p>
      <ol className="mt-4 grid gap-4 md:grid-cols-2">
        {list.map((ev) => (
          <li key={ev.id}>
            <EventCard ev={ev} headingLevel={2} />
          </li>
        ))}
      </ol>
    </div>
  );
}
