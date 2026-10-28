import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { SignInProvider } from "@/components/daily/SignInProvider";
import { AccountSettings } from "@/components/daily/AccountSettings";
import { accountCopy } from "@/content/account";

const t = accountCopy.page;

export const metadata: Metadata = {
  title: t.metaTitle,
  alternates: { canonical: "/account" },
  // a personal page: nothing here for search engines
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <>
      <PageHero compact eyebrow={t.eyebrow} title={t.title} />
      <div className="mx-auto max-w-xl px-4 py-6 md:py-10">
        <SignInProvider>
          <AccountSettings />
        </SignInProvider>
      </div>
    </>
  );
}
