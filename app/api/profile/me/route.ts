import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { put } from "@vercel/blob";

export async function GET() {
  const userId = headers().get("user-id");
  if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 });

  // Note: Direct GET of blob content isn't supported in API routes; use list or fetch URL
  return NextResponse.json({ error: "GET not implemented; use PUT to upload first" }, { status: 501 });
}

export async function PUT(request: Request) {
  const userId = headers().get("user-id");
  if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 });

  const file = await request.blob();
  const { url } = await put(`profiles/${userId}.json`, file, {
    access: "public",
  });
  return NextResponse.json({ url });
}
