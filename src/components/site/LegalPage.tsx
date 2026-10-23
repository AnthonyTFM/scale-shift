import { PageHero } from "@/components/site/PageHero";

type Section = {
  id: string;
  title: string;
  paras?: string[];
  items?: [string, string][];
};

/** Privacy policy and terms: a hero, then plain sections of paragraphs and labelled lists. */
export function LegalPage({
  eyebrow,
  title,
  lead,
  sections,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  sections: Section[];
  children?: React.ReactNode;
}) {
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} lead={<p>{lead}</p>} />
      <div className="prose-atlas mx-auto max-w-3xl px-4 py-10">
        {children}
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-24">
            <h2>{s.title}</h2>
            {s.items ? (
              <ul>
                {s.items.map(([label, text]) => (
                  <li key={label}>
                    <strong>{label}:</strong> {text}
                  </li>
                ))}
              </ul>
            ) : null}
            {s.paras?.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
