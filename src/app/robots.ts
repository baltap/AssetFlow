import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // Replace with your actual production domain when you deploy
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://assetflow.studio";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/terms", "/privacy"],
      disallow: ["/api/", "/_next/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
