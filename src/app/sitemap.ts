import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  // Replace with your actual production domain when you deploy
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://assetflow.studio";

  return [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
