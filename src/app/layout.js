// @ts-check
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** @type {import("next").Metadata} */
export const metadata = {
  title: "Assistente SEMA-MT",
  description: "Tire dúvidas sobre os serviços da SEMA-MT",
};

/**
 * Layout raiz da aplicação.
 * @param {{ children: import("react").ReactNode }} props
 */
export default function RootLayout({ children }) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
