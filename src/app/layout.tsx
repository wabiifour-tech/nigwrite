/**
 * NigWrite - Layout
 * Created by: Wabi The Tech Nurse
 *
 * Root layout with metadata, theme support, and global providers.
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
