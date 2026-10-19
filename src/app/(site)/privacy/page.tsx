import type { Metadata } from "next";
import { site } from "@/content/site";
import { PageHero } from "@/components/site/PageHero";

export const metadata: Metadata = {
  title: "Privacy",
  description: `What ${site.name} collects (very little), why, and how to delete it. No ads and no tracking cookies by default; an email only if you join the leaderboard.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Privacy" title="Privacy policy" lead={<p>Short version: no ads, no tracking cookies by default, and your email only if you join the leaderboard.</p>} />
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
            <strong>Leaderboard (optional):</strong> only if you choose to join. We store your email, the nickname you pick, your daily scores and a
            random ID your browser creates so your scores stay together. Nicknames and scores are public. Your email is private: it is used to keep
            one player per person, is never shown on the site, and is never sold or shared. No real name needed. To stop spam we keep a one-way scrambled code made from your network address for three days; the address itself is never
            stored.
          </li>
          <li>
            <strong>Reminder emails (optional):</strong> only if you tick &ldquo;Email me when a new daily challenge is up&rdquo;. We record
            when you agreed and send at most one email a day about the new challenge and your leaderboard spot. Every email has a one-click
            unsubscribe link, and you can also turn reminders off on the results screen after a daily round.
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
          You can clear local storage at any time in your browser settings. To remove your leaderboard email, nickname and scores, or delete a
          feedback message you sent, email{" "}
          <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
        </p>
        <h2>Data sources</h2>
        <p>Map data is loaded from this site only. Flags and borders are bundled; no third-party map tiles are used.</p>
      </div>
    </>
  );
}
