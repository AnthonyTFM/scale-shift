import type { Metadata } from "next";
import { UnsubscribeResult } from "@/components/site/UnsubscribeResult";

export const metadata: Metadata = {
  title: "Unsubscribe link problem",
  robots: { index: false },
};

export default function UnsubscribeErrorPage() {
  return <UnsubscribeResult failed />;
}
