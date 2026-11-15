import type { Metadata, Viewport } from "next";
import { StudentProvider } from "@/lib/student";
import "./globals.css";

export const metadata: Metadata = {
  title: "Unclaimed",
  description: "USC has set money and help aside. Unclaimed finds what's yours, then an AI agent does the paperwork.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#245F58" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="m-0 bg-paper font-sans text-ink antialiased">
        <StudentProvider>
          <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col overflow-x-hidden border-x border-rule bg-paper">
            {children}
          </div>
        </StudentProvider>
      </body>
    </html>
  );
}
