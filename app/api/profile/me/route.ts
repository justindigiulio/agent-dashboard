import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { get, put } from "@vercel/blob";

/**
 * We store a JSON blob per user at: profiles/{userId}.json
 * For now we derive userId from the Bearer token (same pattern as your leads APIs).
 * Later we’ll swap this for NextAuth session once we turn it back on.
 */

type Profile = {
  userId: string;
  bio: string;
  avatarUrl: string | null; // public URL of the uploaded headshot (we’ll add upload in the next step)
};

function getUserIdFromHeaders(h: Headers) {
  const auth = h.get("authorization") ?? "";
  // TEMP: treat Bearer token as the user id (fallback to a default agent)
  const userId = auth.replace(/^Bearer\s+/i, "") || "agent_123";
  return userId;
}

export async function GET() {
  const h = await headers();
  const userId = getUserIdFromHeaders(h);

  const key = `profiles/${userId}.json`;

  // Try to read the blob. If it doesn't exist, return a default profile.
  try {
    const { blob } = await get(key);
    // `blob.url` is a signed/public URL we can fetch to read the JSON
    const res = await fetch(blob.url, { cache: "no-store" });
    const data = (await res.json()) as Profile;
    return NextResponse.json({ profile: data });
  } catch (err: any) {
    // Not found? Seed a default profile into Blob so future reads are fast.
    const defaultProfile: Profile = { userId, bio: "", avatarUrl: null };
    await put(key, JSON.stringify(defaultProfile), {
      contentType: "application/json",
      access: "public",
    });
    return NextResponse.json({ profile: defaultProfile });
  }
}
