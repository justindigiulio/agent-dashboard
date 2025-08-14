// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
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

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" as const },
  callbacks: {
    async signIn({ user }: any) {
      return isAllowed(user?.email || "");
    },
    async session({ session, token }: any) {
      if (session.user && token.email) session.user.email = token.email as string;
      return session;
    },
    async jwt({ token, profile }: any) {
      if (profile?.email) token.email = profile.email;
      return token;
    },
  },
  pages: { signIn: "/api/auth/signin" },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
