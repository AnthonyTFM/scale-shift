// Server-only: shared pieces of the social preview images, in the Daylight Arcade look.

/** The logo mark (blue square, white bracket corners) as an <img> source; kept in step with src/app/icon.svg. */
export const logoMarkUri = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="11" fill="#2563EB"/><path d="M10.5 19V10.5H19M29.5 21v8.5H21" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
)}`;

export const og = {
  paper: "#FFF8EC",
  card: "#FFFFFF",
  line: "#E8DFCF",
  ink: "#1D2140",
  muted: "#5D6280",
  blue: "#2563EB",
  blueShadow: "#1A47B0",
};
