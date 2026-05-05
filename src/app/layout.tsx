/**
 * NigWrite - Layout
 * Created by: Wabi The Tech Nurse
 *
 * Root layout with metadata, PWA support, theme, and global providers.
 */

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/SessionProvider";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#006B3F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "NigWrite — Academic Integrity & Writing Assistant",
  description:
    "Comprehensive plagiarism detection, AI content detection, and intelligent rewriting platform. Built by Wabi The Tech Nurse.",
  keywords: [
    "NigWrite",
    "plagiarism detection",
    "AI detection",
    "academic integrity",
    "writing assistant",
    "Wabi The Tech Nurse",
  ],
  authors: [{ name: "Wabi The Tech Nurse" }],
  openGraph: {
    title: "NigWrite — Academic Integrity & Writing Assistant",
    description:
      "Detect plagiarism, identify AI-generated content, and automatically rewrite flagged sections.",
    type: "website",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NigWrite",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "NigWrite",
    "application-name": "NigWrite",
    "msapplication-TileColor": "#006B3F",
    "msapplication-tap-highlight": "no",
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
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="NigWrite" />
        <meta name="theme-color" content="#006B3F" />
        <meta name="description" content="NigWrite — Detect plagiarism, identify AI content, and rewrite flagged sections. By Wabi The Tech Nurse." />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            <PWAInstallPrompt />
            {children}
            <Toaster />
            <ServiceWorkerRegistration />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
