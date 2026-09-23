import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { Toaster } from "@/components/ui/sonner";
import { getLocale } from "@/i18n/get-locale";

import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Stock Monitor",
    template: "%s | Stock Monitor",
  },
  description: "Private GPW and USA investment research workspace.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${GeistSans.variable} ${GeistMono.variable} dark`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("stock-monitor-theme");if(t==="light"){document.documentElement.classList.remove("dark");document.documentElement.style.colorScheme="light";}else{document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}var l=localStorage.getItem("stock-monitor-locale");if(l==="en"||l==="pl"){document.documentElement.lang=l;}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
