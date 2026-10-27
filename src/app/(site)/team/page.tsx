import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/site/PageHero";
import { MapIcon } from "@/components/site/Icons";
import { makers, teamCopy as t, type Maker } from "@/content/team";

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.metaDescription,
  alternates: { canonical: "/team" },
};

export default function TeamPage() {
  return (
    <>
      <PageHero eyebrow={t.eyebrow} title={t.title} lead={<p>{t.lead}</p>} />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="sr-only">{t.makersTitle}</h2>
        <ul className="grid gap-6 md:grid-cols-2">
          {makers.map((m) => (
            <li key={m.id}>
              <MakerCard maker={m} />
            </li>
          ))}
        </ul>

        <section aria-labelledby="next" className="card mt-12 max-w-3xl p-5 sm:p-6">
          <h2 id="next" className="font-display text-2xl text-ink">
            {t.nextTitle}
          </h2>
          <p className="mt-3 leading-relaxed text-ink-soft">{t.next}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/daily" className="btn btn-primary">
              {t.play} <span aria-hidden="true">→</span>
            </Link>
            <Link href="/teachers" className="btn btn-white">
              {t.teachers}
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

/** One maker: a square photo (or a map tile until there is one), name, role, a short bio, a few facts and a motto. */
function MakerCard({ maker: m }: { maker: Maker }) {
  return (
    <article aria-labelledby={`maker-${m.id}`} className="card flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-center gap-4">
        {m.photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- one small WebP, already sized for the card
          <img
            src={m.photo.src}
            alt={m.photo.alt}
            width={800}
            height={800}
            loading="lazy"
            decoding="async"
            className="size-24 shrink-0 rounded-2xl bg-tile object-cover ring-1 ring-line sm:size-28"
          />
        ) : (
          <div aria-hidden="true" className="grid size-24 shrink-0 place-items-center rounded-2xl bg-tile ring-1 ring-line sm:size-28">
            <MapIcon className="size-10 opacity-60" />
          </div>
        )}
        <div className="min-w-0">
          <h3 id={`maker-${m.id}`} className="font-display text-2xl leading-tight text-ink">
            {m.name}
          </h3>
          <p className="mt-1 text-sm font-bold text-primary">{m.role}</p>
        </div>
      </div>
      {m.bio.length ? (
        m.bio.map((p) => (
          <p key={p.slice(0, 20)} className="mt-4 leading-relaxed text-ink-soft">
            {p}
          </p>
        ))
      ) : (
        <p className="mt-4 text-muted">{t.comingSoon}</p>
      )}
      {m.facts.length ? (
        <dl className="mt-5 space-y-2 text-sm">
          {m.facts.map((f) => (
            <div key={f.label} className="rounded-xl bg-paper px-3 py-2">
              <dt className="text-xs font-bold uppercase tracking-wide text-muted">{f.label}</dt>
              <dd className="mt-0.5 text-ink">{f.text}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {m.motto ? (
        <blockquote className="mt-5 border-l-4 border-gold pl-3 font-semibold italic text-ink">
          <span className="sr-only">{t.mottoSr}: </span>&ldquo;{m.motto}&rdquo;
        </blockquote>
      ) : null}
    </article>
  );
}
