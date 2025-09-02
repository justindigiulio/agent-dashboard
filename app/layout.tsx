// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Providers from "./providers";
import ChatWidget from "../components/ChatWidget";

export const metadata: Metadata = {
  title: "DiGiulio Agent Dashboard",
  description: "Docs, tools, and listings for DiGiulio agents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <ChatWidget />
        </Providers>
      </body>
    </html>
  );
}
