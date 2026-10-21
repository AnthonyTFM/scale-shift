import type { Metadata } from "next";
import { ViewTransition } from "react";
import AtlasApp from "@/components/map/AtlasApp";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "The map: drag countries and empires to their real size",
  description: site.description,
  alternates: { canonical: "/map" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: site.name,
  url: `${site.url.replace(/\/$/, "")}/map`,
  description: site.description,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any (web browser)",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function MapPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* the homepage globe grows into the map */}
      <div className="atlas-page">
        <ViewTransition name="world" share="morph" default="none">
          <AtlasApp />
        </ViewTransition>
      </div>
    </>
  );
}
