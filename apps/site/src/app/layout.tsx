import type { Metadata, Viewport } from "next";
import { StudentProvider } from "@/lib/student";
import "@/app/globals.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Unclaimed",
  description: "USC has set money and help aside. Unclaimed finds what's yours, then an AI agent does the paperwork.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#245F58" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="m-0 min-h-dvh bg-paper font-sans text-ink antialiased">
        <StudentProvider>{children}</StudentProvider>
      </body>
    </html>
  );
}
