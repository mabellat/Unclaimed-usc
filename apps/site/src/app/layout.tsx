import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { StudentProvider } from "@/lib/student";
import "@/app/globals.css";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-display" });
const sans = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Unclaimed",
  description: "USC has set money and help aside. Unclaimed finds what's yours, then an AI agent does the paperwork.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#111111" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="m-0 min-h-dvh bg-paper font-sans text-ink antialiased">
        <StudentProvider>{children}</StudentProvider>
      </body>
    </html>
  );
}
