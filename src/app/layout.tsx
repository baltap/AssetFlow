import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { PostHogProvider } from "@/components/PostHogProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://assetflow.studio"),
  title: {
    default: "AssetFlow | AI Script-to-Video Storyboarding & Production Studio",
    template: "%s | AssetFlow Studio"
  },
  description: "Transform scripts into cinematic visuals with AssetFlow. AI-powered script segmentation, visual scouting, and production-ready storyboards for filmmakers.",
  keywords: ["AI video generator", "AI storyboarding", "script to video", "filmmaker tools", "visual scouting", "AssetFlow", "video production studio"],
  authors: [{ name: "AssetFlow Team" }],
  creator: "AssetFlow Studio",
  publisher: "AssetFlow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "AssetFlow | AI Script-to-Video Studio",
    description: "Transform your scripts into cinematic visuals in minutes. AI-driven segmentation, emotional beat parsing, and perfect visual scouting for filmmakers.",
    siteName: "AssetFlow",
  },
  twitter: {
    card: "summary_large_image",
    title: "AssetFlow | AI Script-to-Video Studio",
    description: "Transform your scripts into cinematic visuals. The AI-powered co-director for filmmakers.",
    creator: "@AssetFlowStudio",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "AssetFlow",
              "operatingSystem": "Web",
              "applicationCategory": "MultimediaApplication",
              "description": "AI-powered script-to-video storyboarding and stock footage scouting tool for filmmakers and creators.",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              }
            })
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <PostHogProvider>
          <ConvexClientProvider>
            {children}
          </ConvexClientProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
