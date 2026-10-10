/**
 * Public origin of the website, used for canonical URLs, social images, robots and sitemap.
 * Set NEXT_PUBLIC_SITE_URL in the deployment (for example https://varianthub.example).
 * On Vercel the production domain is used when the variable is missing.
 */
export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"),
);

export const siteName = "VariantHub";
export const siteDescription =
  "Compare real components and pages in your project. Explore alternatives on a live canvas, test responsive layouts, and work with your coding agent. Free and open source.";
