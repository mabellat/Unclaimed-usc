import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, Oswald } from "next/font/google";
import { StudentProvider } from "@/lib/student";
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
      <body className="m-0 bg-[#E9E1D2] font-sans text-ink antialiased">
        <StudentProvider>
          <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col overflow-x-hidden bg-paper shadow-[0_0_40px_rgba(60,20,10,.12)]">
            {children}
          </div>
        </StudentProvider>
      </body>
    </html>
  );
}
