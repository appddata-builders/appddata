import type { Metadata } from "next";
import { Comfortaa, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "appddata",
  description: "Desarrollamos páginas web para ti",
  keywords: [
    "appddata",
    "Dev",
    "Tech",
    "Desarrollo",
    "Programacion",
    "Pagina web",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${comfortaa.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className={`${comfortaa.className} min-h-full flex flex-col bg-white text-[#111827] font-sans`}>
        <RouteScrollReset />
        <Navbar />
        <WhatsAppFloat />
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
