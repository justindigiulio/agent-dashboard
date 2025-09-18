import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { getOrCreateProfile } from "../../../../lib/profiles";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const userKey = session.user.email; // unique per agent
  const profile = await getOrCreateProfile(userKey);

  // Keep the response shape simple for the frontend
  return NextResponse.json({
    profile: {
      userId: userKey,
      bio: profile.bio,
      headshotDataUrl: profile.headshotUrl ?? null,
      updatedAt: profile.updatedAt,
    },
  });
}
