// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
// use a relative path to avoid alias issues
import { authOptions } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
