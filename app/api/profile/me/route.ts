import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { put, list } from "@vercel/blob";

/** We store a JSON blob per user at: profiles/{userId}.json */
export async function GET() {
  const userId = headers().get("user-id"); // Example: Adjust based on your logic
  if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 });

  const { blobs } = await list({ prefix: `profiles/${userId}.json` });
  if (blobs.length === 0) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const blob = blobs[0]; // Assume single blob per user
  return NextResponse.json({ url: blob.url });
}

export async function PUT(request: Request) {
  const userId = headers().get("user-id");
  if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 });

  const file = await request.blob();
  const { url } = await put(`profiles/${userId}.json`, file, {
    access: 'public',
    allowDuplicate: true, // Overwrite if exists
  });
  return NextResponse.json({ url });
}
