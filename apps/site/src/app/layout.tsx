import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, Oswald } from "next/font/google";
import { StudentProvider } from "@/lib/student";
import "@/app/globals.css";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "700"], style: ["normal", "italic"], variable: "--font-fraunces" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-inter" });
const oswald = Oswald({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-oswald" });

export const metadata: Metadata = {
  title: "Unclaimed",
  description: "USC has set money and help aside. Unclaimed finds what's yours, then an AI agent does the paperwork.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#990000" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${oswald.variable}`}>
      <body className="m-0 min-h-dvh bg-paper font-sans text-ink antialiased">
        <StudentProvider>{children}</StudentProvider>
      </body>
    </html>
  );
}
