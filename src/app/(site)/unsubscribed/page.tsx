import type { Metadata } from "next";
import { site } from "@/content/site";
import { UnsubscribeResult } from "@/components/site/UnsubscribeResult";

export const metadata: Metadata = {
  title: "Unsubscribed",
  description: `You won't get ${site.name} reminder emails anymore.`,
  robots: { index: false },
};

export default function UnsubscribedPage() {
  return <UnsubscribeResult failed={false} />;
}
