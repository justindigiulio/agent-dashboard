// lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

function isAllowed(email?: string): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  const domain = e.split("@")[1] || "";
  const domains = (process.env.ALLOWLIST_DOMAINS || "")
    .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const emails = (process.env.ALLOWLIST_EMAILS || "")
    .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  return (domain && domains.includes(domain)) || emails.includes(e);
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      return isAllowed(user?.email || "");
    },
    async session({ session, token }) {
      if (session.user && token.email) session.user.email = token.email as string;
      return session;
    },
    async jwt({ token, profile }) {
      if (profile?.email) token.email = profile.email;
      return token;
    },
  },
};
