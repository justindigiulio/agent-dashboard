import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { put } from "@vercel/blob";

/** We store a JSON blob per user at: profiles/{userId}.json */
export async function GET() {
  const header = await headers(); // Await the promise to get Headers
  const userId = header.get("user-id"); // Now get works
  if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 });

  // Note: Direct GET of blob content isn't supported in API routes; use list or fetch URL
  return NextResponse.json({ error: "GET not implemented; use PUT to upload first" }, { status: 501 });
}

export async function PUT(request: Request) {
  const header = await headers(); // Await the promise to get Headers
  const userId = header.get("user-id");
  if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 });

  const file = await request.blob();
  const { url } = await put(`profiles/${userId}.json`, file, {
    access: "public",
  });
  return NextResponse.json({ url });
}
