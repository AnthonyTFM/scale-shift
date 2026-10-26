import { PageHero } from "@/components/site/PageHero";
import type { Metadata } from "next";
import { EndlessGame } from "@/components/endless/EndlessGame";
import { SignInProvider } from "@/components/daily/SignInProvider";
import { endlessCopy as t } from "@/content/endless";

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.metaDescription,
  alternates: { canonical: "/endless" },
};

export default function EndlessPage() {
  return (
    <>
      <PageHero
        center
        compact
        eyebrow={t.eyebrow}
        title={t.title}
        lead={
          <p>
            <span className="sm:hidden">{t.leadShort}</span>
            <span className="hidden sm:inline">{t.lead}</span>
          </p>
        }
      />
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-3 sm:pt-6 md:pb-10">
        <div className="mx-auto max-w-2xl">
          <SignInProvider>
            <EndlessGame />
          </SignInProvider>
          <p className="mt-6 text-xs leading-relaxed text-muted">{t.note}</p>
        </div>
      </div>
    </>
  );
}
