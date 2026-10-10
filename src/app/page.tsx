import { MarketingLanding } from "@/components/marketing/landing";
import type { Metadata } from "next";
import { siteDescription, siteName } from "@/lib/site";
const title = "VariantHub — Good interfaces deserve a proper comparison";

export const metadata: Metadata = {
  title,
  description: siteDescription,
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName, locale: "en_US", title, description: siteDescription, url: "/" },
  twitter: { card: "summary_large_image", title, description: siteDescription },
};
export default function Home() {
  return <MarketingLanding />;
}
