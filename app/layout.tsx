import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DiGiulio Agent Dashboard",
  description: "Docs search and tools for DiGiulio agents",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
