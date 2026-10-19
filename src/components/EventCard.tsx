import type { TerritoryEvent } from "@/content/events";
import { eventTypeLabels, statusLabels } from "@/content/events";
import { eraForYear, formatYear, settleTime } from "@/lib/eras";
import { mapLink } from "@/lib/share";

const statusStyle = {
  formal: "bg-emerald-50 text-formal ring-emerald-200",
  force: "bg-amber-50 text-force ring-amber-200",
  disputed: "bg-rose-50 text-disputed ring-rose-200",
} as const;

/** "Taken → formalized" card used on content pages. */
export function EventCard({ ev, headingLevel = 3 }: { ev: TerritoryEvent; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  const era = eraForYear(ev.taken);
  return (
    <article className="rounded-card border border-line bg-white p-5 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{eventTypeLabels[ev.type]}</span>
        <span className={`rounded-full px-2.5 py-1 ring-1 ${statusStyle[ev.status]}`}>{statusLabels[ev.status]}</span>
        <span className="text-muted">{ev.region}</span>
      </div>
      <H className="font-display text-lg leading-snug text-ink">{ev.title}</H>
      <TakenFormalized ev={ev} />
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{ev.summary}</p>
      <a
        href={mapLink(era.key, [ev.lon, ev.lat])}
        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-link hover:underline"
      >
        See it on {era.key === "present" ? "today\u2019s" : `the ${era.label}`} map <span aria-hidden="true">→</span>
      </a>
    </article>
  );
}

export function TakenFormalized({ ev, dark = false }: { ev: TerritoryEvent; dark?: boolean }) {
  const label = dark ? "text-panel-muted" : "text-muted";
  const value = dark ? "text-panel-text" : "text-ink";
  return (
    <div className="mt-3 text-sm">
      <dl className="grid grid-cols-2 gap-2">
        <div>
          <dt className={`text-[11px] font-semibold uppercase tracking-wide ${label}`}>Control taken</dt>
          <dd className={`font-semibold ${value}`}>{formatYear(ev.taken, ev.approx)}</dd>
        </div>
        <div>
          <dt className={`text-[11px] font-semibold uppercase tracking-wide ${label}`}>Made official</dt>
          <dd className={`font-semibold ${value}`}>
            {ev.formalized === null ? (ev.status === "disputed" ? "Not recognized" : "Never") : formatYear(ev.formalized, ev.approx)}
          </dd>
        </div>
      </dl>
      <p className={`mt-2 text-xs ${label}`}>
        {settleTime(ev)}
        {ev.formalizedBy ? ` · ${ev.formalizedBy}` : ""}
      </p>
    </div>
  );
}
