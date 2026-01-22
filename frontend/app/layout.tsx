import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ThemeScript from "@/components/ThemeScript";

const font = Inter({
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Co-Writer Independent",
  description: "AI Co-Writer",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={font.className} suppressHydrationWarning>
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors duration-200">
            <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
            {children}
            </main>
        </div>
      </body>
    </html>
  );
}
