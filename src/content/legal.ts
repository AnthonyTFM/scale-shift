// Privacy policy, terms, the age check at sign-up and "Delete my data". Plain words; a lawyer should review before money.
import { site } from "./site";

export const legalUpdated = "October 23, 2026";

/** Shown before anyone gives us an email (sign-in, the leaderboard, reminders). */
export const ageCheck = {
  label: "I'm 13 or older",
  hint: "The leaderboard and emails are for ages 13 and up. Anyone can play without joining.",
  needed: "Please confirm you're 13 or older to join the leaderboard.",
  agree: "By joining you agree to our",
  terms: "terms",
  and: "and",
  privacy: "privacy policy",
};

/** The signed-in player's controls on /leaderboard. */
export const account = {
  delete: "Delete my data",
  deleteConfirm: "Delete your scores, nickname, email and sign-in account? This can't be undone.",
  deleteYes: "Delete everything",
  deleting: "Deleting…",
  keep: "Keep my data",
  deleteFailed: "We couldn't delete your data just now. Please try again, or email us.",
  deleted: "Your data has been deleted. Thanks for playing.",
};

export type Section = { id: string; title: string; paras?: string[]; items?: [string, string][] };

/** Words on these pages that become links. */
export const legalLinks: Record<string, string> = {
  [site.contactEmail]: `mailto:${site.contactEmail}`,
  "About page": "/about",
  "data license file": "/data/LICENSE.txt",
  "Leaderboard page": "/leaderboard",
  "privacy policy": "/privacy",
};

export const privacy: { title: string; lead: string; description: string; sections: Section[] } = {
  title: "Privacy policy",
  lead: "Short version: you can play without giving us anything. If you join the leaderboard, we keep your email private, show only your nickname and scores, and delete it all when you ask.",
  description: `What ${site.name} collects, why, who helps us run it, how long we keep it and how to delete it.`,
  sections: [
    {
      id: "who",
      title: "Who we are",
      paras: [
        `${site.name} is a free, independent project run by its two creators. For anything about your data, email ${site.contactEmail}. We answer within 30 days.`,
      ],
    },
    {
      id: "collect",
      title: "What we collect",
      items: [
        ["Map state", "The shapes you add live in the page address (the part after #). It never reaches our server unless you share the link."],
        ["Settings in your browser", "Your area unit, sound on or off, whether you've seen the intro, your daily answers, scores and streak, your 13+ answer and, if you join, your player ID and nickname are saved in your browser's local storage. They stay on your device."],
        [
          "Leaderboard and sign-in (optional, ages 13+)",
          "Only if you join. You sign in with an email code or Google through Clerk, our sign-in provider, which confirms you own the email (with Google, Clerk also receives your name and profile photo). We store that email, the nickname you pick, your daily answers and scores and a random player ID. Nicknames and scores are public. Your email is private: it keeps one player per person, is never shown publicly or sold and only goes to the services below that run the site.",
        ],
        ["Reminder emails (optional)", "Only if you tick the box. We record when you agreed. Once reminders start, we'll send at most one email a day, each with a one-click unsubscribe, and you can turn them off after any daily round."],
        ["Feedback form", "What you type, plus your name and email if you give them, and your browser type so we can reproduce map problems."],
        ["Spam protection", "To stop one person flooding the leaderboard, we keep a scrambled code made from your network address with a secret key for three days. The address itself isn't stored."],
        ["Server logs", "Our host records basic request details (such as network address and browser type) to keep the site running and secure, and keeps them only briefly."],
        ["Visit counts", "We count visits with Vercel Web Analytics, which sets no cookies and doesn't follow you to other sites. For each page view it records the page, the site that linked to it, your country and your device and browser type. It doesn't store your network address or anything that names you. If we ever turn on Google Analytics or ads, we'll update this page first and ask for your consent where the law requires it."],
      ],
    },
    {
      id: "why",
      title: "Why we use it",
      paras: [
        "We use it to run the leaderboard you asked to join (our agreement with you), to send reminders you opted into (your consent, which you can withdraw any time) and to keep the site safe from spam and abuse (our legitimate interest). We never sell your personal information or use or share it for advertising.",
      ],
    },
    {
      id: "providers",
      title: "Who helps us run the site",
      items: [
        ["Vercel", "hosts the site and counts visits (Web Analytics, no cookies)."],
        ["Clerk", "handles sign-in (email codes, or Google if you choose it)."],
        ["Upstash", "stores the leaderboard database and the messages you send us through the feedback form."],
        ["Resend", "will send reminder emails once they start, and may deliver feedback messages to us."],
      ],
      paras: ["These companies process data for us under their own privacy and security terms. Your data may be processed in the United States and other countries where they operate."],
    },
    {
      id: "keep",
      title: "How long we keep it",
      paras: [
        "Leaderboard and sign-in data: until you delete it (see below). Network codes: three days. Feedback: only as long as we need it to fix the map and reply, and we delete it on request. Server logs: a short time, set by our host.",
      ],
    },
    {
      id: "rights",
      title: "Your choices and rights",
      paras: [
        "Signed in? Open the Leaderboard page and tap “Delete my data”. It removes your scores, nickname, email, reminder choice and sign-in account straight away.",
        `You can also email ${site.contactEmail} to see, correct or delete your data, object to how we use it or withdraw consent. Wherever you live, we'll honor these requests. If you're in the EU or UK, you can also complain to your data protection authority.`,
        "To clear what's saved on your device, clear this site's data in your browser settings.",
        "We don't track you across other websites, so Do Not Track settings don't change anything here.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies",
      paras: [
        "We don't use advertising or tracking cookies. When you tap Sign in, Clerk loads and sets cookies that keep you signed in. They're needed for sign-in to work, so they don't need a consent banner.",
      ],
    },
    {
      id: "children",
      title: "Children",
      paras: [
        "Anyone can play without an account. The leaderboard, sign-in and emails are for ages 13 and up, and we ask before anyone joins. We don't knowingly collect personal information from children under 13. If you think a child under 13 has given us an email, write to us and we'll delete it.",
      ],
    },
    {
      id: "changes",
      title: "Changes",
      paras: [`We'll update this page if anything changes and show the new date here. Last updated ${legalUpdated}.`],
    },
  ],
};

export const terms: { title: string; lead: string; description: string; sections: Section[] } = {
  title: "Terms of use",
  lead: `The rules for using ${site.name}, in plain words.`,
  description: `The rules for using ${site.name}: the leaderboard, nicknames, map accuracy and data licenses.`,
  sections: [
    {
      id: "use",
      title: "Using the site",
      paras: [
        `${site.name} is free to use. By using it you agree to these terms. If you don't agree, please don't use the site. Questions: ${site.contactEmail}.`,
      ],
    },
    {
      id: "leaderboard",
      title: "The leaderboard",
      paras: [
        "You must be 13 or older to sign in, join the leaderboard or get emails.",
        "One player per person. Only your first try each day counts. Don't use bots, scripts or other tricks to post scores. We may remove scores or players that break these rules.",
        "There are no prizes. Rankings are just for fun.",
      ],
    },
    {
      id: "nicknames",
      title: "Nicknames",
      paras: [
        "Pick a nickname that isn't offensive, doesn't pretend to be someone else (including us) and isn't your full real name. We may change or remove any nickname without notice.",
      ],
    },
    {
      id: "accuracy",
      title: "Maps and facts",
      paras: [
        "Historical borders are approximate, especially before about 1650. Areas are calculated from our map outlines and can differ from official figures by a few percent.",
        "Disputed borders are shown to explain who controls and who claims each place, not to take a political side. Don't rely on the site for legal, navigation or official purposes.",
      ],
    },
    {
      id: "content",
      title: "Our content and the map data",
      paras: [
        `The site's design, text and code belong to its creators, except the scripts that build the map data, which are offered under GPL-3.0. Map data comes from other projects under their own licenses: the historical borders are from historical-basemaps by André Ourednik under GPL-3.0, and today's borders are from Natural Earth (public domain). Full details are on the About page and in the data license file. You may share links and screenshots of the map with credit to ${site.name}.`,
      ],
    },
    {
      id: "warranty",
      title: "No warranty",
      paras: [
        "The site is provided as it is, without warranties of any kind. We aren't liable for any loss that comes from using it, to the fullest extent the law allows. We may change, pause or stop any part of the site at any time.",
      ],
    },
    {
      id: "changes",
      title: "Changes",
      paras: [`We may update these terms and will show the new date here. Last updated ${legalUpdated}.`],
    },
  ],
};
