import type { Metadata } from "next";
import { Comfortaa, Geist_Mono } from "next/font/google";

import { getT } from "@/lib/text/server-text";
import { getHydratedTexts } from "@/lib/hydrate/texts";
import { TextProvider } from "@/lib/text/text-provider";

import Navbar from "./components/navbar";
import PageTransition from "./components/page-transition";
import RouteScrollReset from "./components/route-scroll-reset";
import WhatsAppFloat from "./components/whatsapp-float";
import "./globals.css";

const comfortaa = Comfortaa({
  variable: "--font-comfortaa",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * La metadata tambien sale de `hydrate`: `generateMetadata` corre en el
 * servidor, donde `useT` no existe, asi que usa el `t` de servidor.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("es.meta.title"),
    description: t("es.meta.description"),
    keywords: t("es.meta.keywords")
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Un solo viaje a `hydrate` por request (cacheado por HYDRATE_CACHE_TTL_MS):
  // de aqui toman los textos todas las pantallas de cliente con `useT()`.
  const texts = await getHydratedTexts();

  return (
    <html
      lang="es"
      className={`${comfortaa.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className={`${comfortaa.className} min-h-full flex flex-col bg-white text-[#111827] font-sans`}>
        <TextProvider texts={texts}>
          <RouteScrollReset />
          <Navbar />
          <WhatsAppFloat />
          <PageTransition>{children}</PageTransition>
        </TextProvider>
      </body>
    </html>
  );
}
