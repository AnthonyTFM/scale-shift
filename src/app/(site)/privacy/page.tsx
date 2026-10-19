import type { Metadata } from "next";
import { site } from "@/content/site";
import { PageHero } from "@/components/site/PageHero";

export const metadata: Metadata = {
  title: "Privacy",
  description: `What ${site.name} collects (very little), why, and how to delete it. No accounts, no ads and no tracking cookies by default.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Privacy" title="Privacy policy" lead={<p>Short version: no accounts, no ads, no tracking cookies by default.</p>} />
      <div className="prose-atlas mx-auto max-w-3xl px-4 py-10">
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Map state:</strong> the shapes you add live in the page address (the part after #). It never reaches our server unless you
            share the link.
          </li>
          <li>
            <strong>Preferences:</strong> your area unit and whether you have seen the intro are saved in your browser&apos;s local storage.
          </li>
          <li>
            <strong>Daily challenge:</strong> your answers, scores and streak are saved in your browser only.
          </li>
          <li>
            <strong>Leaderboard (optional):</strong> only if you choose to join. We store the nickname you pick, your daily scores and a random
            ID your browser creates so your scores stay together. Nicknames and scores are public. No email, no account and no real name
            needed. To stop spam we keep a one-way scrambled code made from your network address for three days; the address itself is never
            stored.
          </li>
          <li>
            <strong>Feedback form:</strong> if you send a report, we store what you type (and your email, if you give it) so we can fix the map
            and reply. We do not sell or share it.
          </li>
          <li>
            <strong>Analytics:</strong> off by default. If the site owners turn on Google Analytics, anonymous usage events (page views, era
            changes, shares, daily scores) are sent to it.
          </li>
        </ul>
        <h2>Your choices</h2>
        <p>
          You can clear local storage at any time in your browser settings. To remove your leaderboard nickname and scores, or delete a
          feedback message you sent, email{" "}
          <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
        </p>
        <h2>Data sources</h2>
        <p>Map data is loaded from this site only. Flags and borders are bundled; no third-party map tiles are used.</p>
      </div>
    </>
  );
}
