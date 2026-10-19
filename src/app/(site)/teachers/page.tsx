import type { Metadata } from "next";
import Link from "next/link";
import { activities, tips } from "@/content/teachers";
import { site } from "@/content/site";
import { mapUrl } from "@/lib/share";
import { PageHero } from "@/components/site/PageHero";
import { PrintButton } from "@/components/site/PrintButton";

export const metadata: Metadata = {
  title: "For teachers: classroom activities on maps, empires and borders",
  description: `Free, ready-to-run classroom activities using ${site.name}: the Mercator myth, empires then and now, who ruled your town, and disputed borders. No accounts needed.`,
  alternates: { canonical: "/teachers" },
};

export default function TeachersPage() {
  return (
    <>
      <PageHero
        eyebrow="For teachers"
        title="Teach maps, empires and borders in one lesson"
        lead={
          <p>
            Six activities from a 5-minute warm-up to a 40-minute debate, each with steps, questions and answer notes. Everything runs in the
            browser with no logins, and we collect no student data.
          </p>
        }
      />
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="no-print mb-8 flex flex-wrap items-center gap-3">
          <PrintButton />
          <Link href="/daily" className="inline-flex h-11 items-center rounded-lg bg-accent px-4 font-bold text-panel hover:bg-accent-strong">
            Open today&apos;s challenge
          </Link>
          <Link href="/map" className="inline-flex h-11 items-center rounded-lg border border-line bg-white px-4 font-semibold hover:bg-paper">
            Open the map
          </Link>
        </div>

        <nav aria-label="Activities" className="no-print mb-10">
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {activities.map((a, i) => (
              <li key={a.id}>
                <a href={`#${a.id}`} className="flex h-full items-baseline gap-2 rounded-lg border border-line bg-white p-3 hover:border-amber-300">
                  <span className="font-display text-lg text-muted">{i + 1}</span>
                  <span>
                    <span className="block font-semibold text-ink">{a.title}</span>
                    <span className="text-xs text-muted">
                      {a.minutes} · ages {a.ages}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-8">
          {activities.map((a, i) => (
            <article key={a.id} id={a.id} className="print-card scroll-mt-24 rounded-card border border-line bg-white p-5 shadow-sm md:p-7">
              <p className="text-xs font-bold uppercase tracking-wide text-formal">
                Activity {i + 1} · {a.minutes} · Ages {a.ages}
              </p>
              <h2 className="mt-1 font-display text-2xl text-ink md:text-3xl">{a.title}</h2>
              <p className="mt-2 text-ink-soft">
                <strong className="text-ink">Goal:</strong> {a.goal}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {a.links.map((l) => (
                  <Link
                    key={l.label}
                    href={l.map ? mapUrl(l.map) : (l.href ?? "/map")}
                    className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-ink ring-1 ring-amber-200 hover:ring-amber-400"
                  >
                    {l.label} →
                  </Link>
                ))}
              </div>
              <div className="mt-5 grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="font-bold text-ink">Steps</h3>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-ink-soft">
                    {a.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h3 className="font-bold text-ink">Ask the class</h3>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-soft">
                    {a.questions.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                  <h3 className="mt-4 font-bold text-ink">Teacher notes</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{a.notes}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <section aria-labelledby="tips" className="mt-12 rounded-card bg-emerald-50 p-6 ring-1 ring-emerald-200">
          <h2 id="tips" className="font-display text-2xl text-ink">
            Classroom tips
          </h2>
          <ul className="mt-3 space-y-2 text-ink-soft">
            {tips.map((t) => (
              <li key={t} className="flex gap-2">
                <span aria-hidden="true" className="text-formal">
                  ✔
                </span>
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-ink-soft">
            Using {site.name} in class? We&apos;d love to hear what works.{" "}
            <Link href="/contact?topic=classroom" className="font-semibold text-link underline">
              Send us a note
            </Link>
            .
          </p>
        </section>
      </div>
    </>
  );
}
