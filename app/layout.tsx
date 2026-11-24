import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PLASTIMAD — Una nueva vida, por naturaleza",
  description:
    "Transformamos residuos en espacios vivos. Macetas de madera plástica reciclada, diseño consciente y una experiencia 3D.",
  openGraph: {
    title: "PLASTIMAD — Transformamos residuos en espacios vivos",
    description:
      "Diseño que permanece. Naturaleza que inspira. Descubre nuestras macetas de madera plástica reciclada.",
    locale: "es_EC",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
