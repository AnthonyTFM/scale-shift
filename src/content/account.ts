// Your account: the one-time welcome pop-up after signing up, and the account page (menu → Account).

export const accountCopy = {
  // the menu row and the header button
  menuSignedIn: "Your account",
  menuSignedOut: "Sign in",
  menuBlurbSignedIn: "Username, emails, sign out",
  menuBlurbSignedOut: "Save your streak on every device",
  headerSr: "Your account",

  // shown once, right after the first sign-in saves a streak
  welcome: {
    title: "You're in!",
    lead: "Your streak is saved on every device. Two quick things, both optional:",
    nameLabel: "Pick a username",
    nameHint: "Shown on the Best streaks board. 3 to 16 characters, not your full real name.",
    remind: "Email me when a new daily challenge is up (starting soon)",
    remindHint: "Unsubscribe any time with one click.",
    done: "Done",
    saving: "Saving…",
    skip: "Skip for now",
    later: "Change these any time: Menu → Your account.",
  },

  // the account page
  page: {
    metaTitle: "Your account",
    eyebrow: "Account",
    title: "Your account",
    loading: "Checking whether you're signed in…",
    signedOutTitle: "Sign in to save your progress",
    signedOutLead:
      "Your daily streak and results follow you to any phone or computer, and you get a username for the Best streaks board. Daily scores stay private.",
    signIn: "Sign in",
    opening: "Opening sign-in…",
    signInFailed: "Sign-in didn't open. Check your connection (or an ad blocker) and try again.",
    nameTitle: "Username",
    nameLead: "What everyone sees on the Best streaks board.",
    namePlaceholder: "e.g. MapWizard",
    nameSave: "Save",
    nameSaved: "Saved. This is the name the Best streaks board shows.",
    nameSame: "That's already your username.",
    nameLeadNone: "You haven't picked one yet. It's what everyone sees on the Best streaks board.",
    emailsTitle: "Emails",
    remind: "Email me when a new daily challenge is up (starting soon)",
    remindOn: "Done. You're on the list for reminder emails, which start soon.",
    remindOff: "Done. No more reminder emails.",
    signedInAs: "Signed in",
    signOut: "Sign out",
    dangerTitle: "Your data",
  },

  // the short line on the daily results once a streak is saved
  saved: "Streak saved on every device",
  savedAs: (name: string) => `Signed in as ${name}`,
  manage: "Account settings",

  // the leaderboard page, signed out
  boardPrompt: "Pick a username for the Best streaks board, saved on every device:",

  // the page after a reminder-email unsubscribe link
  unsubscribe: {
    eyebrow: "Reminder emails",
    title: "You're unsubscribed",
    lead: "You won't get any more daily challenge reminders. Your streak and scores stay saved.",
    failedTitle: "That link didn't work",
    failedLead:
      "The unsubscribe link was incomplete. Sign in and turn reminders off on your account page (Menu → Your account), or contact us and we'll do it for you.",
    play: "Play today's five",
    contact: "Contact us",
  },

  errors: {
    network: "Couldn't reach the server. Please try again.",
    generic: "Couldn't save that. Please try again.",
    nameLength: "Use 3 to 16 characters.",
    nameOffensive: "Please pick a different username.",
    load: "Couldn't load your account.",
    retry: "Try again",
  },
};
