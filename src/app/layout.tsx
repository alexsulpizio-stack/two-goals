import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";

import { SiteFooter, SiteHeader } from "@/components/site-header";

import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Two Goals",
  description:
    "A personal compass for two aims: to live eternally with Jesus Christ, and to live financially independent.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sourceSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
