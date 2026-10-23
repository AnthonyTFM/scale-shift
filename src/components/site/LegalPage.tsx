import { Fragment } from "react";
import Link from "next/link";
import { PageHero } from "@/components/site/PageHero";
import { legalLinks, type Section } from "@/content/legal";

const linkPattern = new RegExp(`(${Object.keys(legalLinks).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`);

/** Plain text with the contact email and page names turned into links. */
function Linked({ text }: { text: string }) {
  return text.split(linkPattern).map((part, i) => {
    const href = legalLinks[part];
    if (!href) return <Fragment key={i}>{part}</Fragment>;
    return href.startsWith("/") && !href.includes(".") ? (
      <Link key={i} href={href}>
        {part}
      </Link>
    ) : (
      <a key={i} href={href}>
        {part}
      </a>
    );
  });
}

/** Privacy policy and terms: a hero, then plain sections of paragraphs and labeled lists. */
export function LegalPage({ eyebrow, title, lead, sections }: { eyebrow: string; title: string; lead: string; sections: Section[] }) {
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} lead={<p>{lead}</p>} />
      <div className="prose-atlas mx-auto max-w-3xl px-4 py-10">
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-24">
            <h2>{s.title}</h2>
            {s.items ? (
              <ul>
                {s.items.map(([label, text]) => (
                  <li key={label}>
                    <strong>{label}:</strong> <Linked text={text} />
                  </li>
                ))}
              </ul>
            ) : null}
            {s.paras?.map((p) => (
              <p key={p}>
                <Linked text={p} />
              </p>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
