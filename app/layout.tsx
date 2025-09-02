// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Providers from "./providers";               // <-- your SessionProvider wrapper
import ChatWidget from "../components/ChatWidget"; // <-- the floating popup

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
          {/* Floating assistant, available on all signed-in pages */}
          <ChatWidget />
        </Providers>
      </body>
    </html>
  );
}

