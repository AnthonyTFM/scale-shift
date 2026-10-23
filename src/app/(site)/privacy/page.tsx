import type { Metadata } from "next";
import { privacy } from "@/content/legal";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = {
  title: "Privacy",
  description: privacy.description,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <LegalPage eyebrow="Privacy" title={privacy.title} lead={privacy.lead} sections={privacy.sections} />;
}
