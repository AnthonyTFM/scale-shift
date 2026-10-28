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
    remind: "Email me when a new daily challenge is up",
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
    nameTitle: "Username",
    nameLead: "What everyone sees on the Best streaks board.",
    namePlaceholder: "e.g. MapWizard",
    nameSave: "Save",
    nameSaved: "Saved. The board shows your new name.",
    noName: "No username yet",
    emailsTitle: "Emails",
    remind: "Email me when a new daily challenge is up",
    remindOn: "Done. We'll email you when a new challenge is up.",
    remindOff: "Done. No more reminder emails.",
    signedInAs: "Signed in",
    signOut: "Sign out",
    dangerTitle: "Your data",
  },

  // the short line on the daily results once a streak is saved
  saved: "Streak saved on every device",
  savedAs: (name: string) => `Signed in as ${name}`,
  manage: "Account settings",

  errors: {
    network: "Couldn't reach the server. Please try again.",
    generic: "Couldn't save that. Please try again.",
  },
};
