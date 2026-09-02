import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Stock Monitor",
    template: "%s | Stock Monitor",
  },
  description: "Private GPW and USA investment research workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} dark`}
    >
      <body>{children}</body>
    </html>
  );
}
