import Link from "next/link";
import { PageShell } from "@/components/SiteChrome";

export default function NotFound() {
  return (
    <PageShell>
      <h1 className="font-display text-[2.6rem] leading-tight">This page isn&apos;t on any map</h1>
      <p className="mt-3 max-w-[55ch] text-lg text-ink-soft">The link may be old or mistyped. Start from the map or browse the empire timelines.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/" className="btn btn-primary">
          Open the map
        </Link>
        <Link href="/history" className="btn btn-ghost">
          Browse empires
        </Link>
      </div>
    </PageShell>
  );
}
