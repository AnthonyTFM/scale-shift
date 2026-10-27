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
        <section aria-labelledby="story" className="card max-w-3xl p-5 sm:p-6">
          <h2 id="story" className="font-display text-2xl text-ink">
            {t.storyTitle}
          </h2>
          {t.story.map((p) => (
            <p key={p.slice(0, 20)} className="mt-3 leading-relaxed text-ink-soft">
              {p}
            </p>
          ))}
        </section>

        <h2 className="mt-12 font-display text-2xl text-ink">{t.makersTitle}</h2>
        <ul className="mt-4 grid gap-5 md:grid-cols-2">
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

/** One maker: a photo (or a map tile until there is one), name, role, a short bio, a few facts and a motto. */
function MakerCard({ maker: m }: { maker: Maker }) {
  return (
    <article aria-labelledby={`maker-${m.id}`} className="card flex h-full flex-col overflow-hidden">
      {m.photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- one small WebP, already sized for the card
        <img
          src={m.photo.src}
          alt={m.photo.alt}
          width={640}
          height={800}
          loading="lazy"
          decoding="async"
          // tall on phones, wider from sm up; kept to the left and the top of the photo, where the person is
          className="aspect-[4/5] w-full bg-tile object-cover object-[0%_8%] sm:aspect-[5/4]"
        />
      ) : (
        <div aria-hidden="true" className="grid aspect-[4/5] w-full place-items-center bg-tile sm:aspect-[5/4]">
          <MapIcon className="size-16 opacity-60" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <h3 id={`maker-${m.id}`} className="font-display text-2xl leading-tight text-ink">
          {m.name}
        </h3>
        <p className="mt-0.5 text-sm font-bold text-primary">{m.role}</p>
        {m.bio.length ? (
          m.bio.map((p) => (
            <p key={p.slice(0, 20)} className="mt-3 text-sm leading-relaxed text-ink-soft">
              {p}
            </p>
          ))
        ) : (
          <p className="mt-3 text-sm text-muted">{t.comingSoon}</p>
        )}
        {m.facts.length ? (
          <dl className="mt-4 space-y-2 text-sm">
            {m.facts.map((f) => (
              <div key={f.label} className="rounded-xl bg-paper px-3 py-2">
                <dt className="text-xs font-bold uppercase tracking-wide text-muted">{f.label}</dt>
                <dd className="text-ink">{f.text}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {m.motto ? (
          <blockquote className="mt-4 border-l-4 border-gold pl-3 font-semibold italic text-ink">
            <span className="sr-only">{t.mottoSr}: </span>&ldquo;{m.motto}&rdquo;
          </blockquote>
        ) : null}
      </div>
    </article>
  );
}

