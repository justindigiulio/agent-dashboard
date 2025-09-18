import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { updateProfile } from "../../../../lib/profiles";
import { put } from "@vercel/blob";

export const runtime = "nodejs"; // required for Blob uploads
const MAX_BYTES = 2_000_000;     // ~2MB

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const userKey = session.user.email;

  const form = await req.formData();
  const bio = (form.get("bio") as string) ?? "";
  const file = form.get("headshot") as File | null;

  let headshotUrl: string | undefined;

  if (file && file.size > 0) {
    if (file.size > MAX_BYTES) {
      return new NextResponse("File too large (max 2MB)", { status: 413 });
    }
    const key = `headshots/${encodeURIComponent(userKey)}-${Date.now()}`;
    const { url } = await put(key, file, {
      access: "public",
      contentType: file.type || "image/jpeg",
      addRandomSuffix: true
    });
    headshotUrl = url;
  }

  const updated = await updateProfile(userKey, {
    bio,
    ...(headshotUrl !== undefined ? { headshotUrl } : {})
  });

  return NextResponse.json({
    ok: true,
    profile: {
      userId: userKey,
      bio: updated.bio,
      headshotDataUrl: updated.headshotUrl ?? null,
      updatedAt: updated.updatedAt
    }
  });
}
