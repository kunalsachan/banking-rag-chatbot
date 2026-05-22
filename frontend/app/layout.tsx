import type { Metadata, Viewport } from "next";
import "./globals.css";

// ------------------------------------------------------------------ //
//  Metadata — shown in browser tab, SEO, and social sharing           //
// ------------------------------------------------------------------ //

export const metadata: Metadata = {
  title: "BankBot AI — Intelligent Banking Support",
  description:
    "AI-powered banking support chatbot. Get instant answers about accounts, loans, credit cards, and more — powered by RAG technology.",
  keywords: [
    "banking chatbot",
    "AI banking support",
    "RAG chatbot",
    "GenAI banking",
  ],
  authors: [{ name: "BankBot AI" }],
  robots: "noindex, nofollow", // private internal tool
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

// ------------------------------------------------------------------ //
//  Root layout                                                         //
// ------------------------------------------------------------------ //

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to Google Fonts for faster load */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
