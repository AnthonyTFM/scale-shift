import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { site } from "@/content/site";
import "./globals.css";

// Inter for body text (variable, 400–800); Bricolage Grotesque ExtraBold for headings, numbers and the wordmark
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], display: "swap", weight: "800" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name}: the real size of countries and empires through history`, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  openGraph: { type: "website", siteName: site.name, locale: "en_US" },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#fff8ec",
  width: "device-width",
  initialScale: 1,
};

const GA_ID = process.env.NEXT_PUBLIC_GA4_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bricolage.variable} antialiased`} suppressHydrationWarning>
      <head>
        {/* Runs before first paint: returning visitors and shared map links skip the map's intro card.
            Kept in the root layout (rendered once, on the server) because React won't run scripts it renders in the browser. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("atlas-intro-seen")==="1"||location.hash.length>2)document.documentElement.classList.add("intro-seen")}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-dvh">
        {children}
        {GA_ID ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="lazyOnload" />
            <Script id="ga4" strategy="lazyOnload">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}');`}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
