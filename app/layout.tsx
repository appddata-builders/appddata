import type { Metadata } from "next";
import { Krub, Diphylleia, Geist_Mono } from "next/font/google";
import Navbar from "./components/navbar";
import PageTransition from "./components/page-transition";
import RouteScrollReset from "./components/route-scroll-reset";
import WhatsAppFloat from "./components/whatsapp-float";
import "./globals.css";

const krub = Krub({
  variable: "--font-krub",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const diphylleia = Diphylleia({
  variable: "--font-diphylleia",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "appdda",
  description: "Desarrollamos páginas web para ti",
  keywords: [
    "appdda",
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
      className={`${krub.variable} ${diphylleia.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className={`${diphylleia.className} min-h-full flex flex-col bg-white text-[#111827] font-sans`}>
        <RouteScrollReset />
        <Navbar />
        <WhatsAppFloat />
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
