import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { StudentProvider } from "@/lib/student";
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
      <body className="m-0 bg-[#E7E7E2] font-sans text-ink antialiased">
        <StudentProvider>
          <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col overflow-x-hidden bg-paper shadow-[0_0_40px_rgba(0,0,0,.12)]">
            {children}
          </div>
        </StudentProvider>
      </body>
    </html>
  );
}
