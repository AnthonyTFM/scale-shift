import { site } from "@/content/site";

/**
 * The brand mark: a blue rounded square with two white bracket corners, like the measuring marks on a ruler or a
 * crop tool. Kept in step with src/app/icon.svg and the social preview images.
 */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={className}>
      <rect width="40" height="40" rx="11" fill="#2563EB" />
      <path d="M10.5 19V10.5H19M29.5 21v8.5H21" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Logo mark plus the site name, as used in the header, footer and menu. */
export function Wordmark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark className={size === "lg" ? "size-10" : "size-8"} />
      <span className={`font-display leading-none tracking-tight text-ink ${size === "lg" ? "text-[1.7rem]" : "text-[1.35rem]"}`}>{site.name}</span>
    </span>
  );
}
