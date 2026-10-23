import type { Metadata } from "next";
import { terms } from "@/content/legal";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = {
  title: "Terms",
  description: terms.description,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <LegalPage eyebrow="Terms" title={terms.title} lead={terms.lead} sections={terms.sections} />;
}
