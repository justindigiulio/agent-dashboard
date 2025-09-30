import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { put } from "@vercel/blob";

export async function PUT(request: Request) {
  const header = await headers();
  const userId = header.get("user-id");
  if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 });

  const file = await request.blob();
  const { url } = await put(`profiles/${userId}.json`, file, {
    access: "public",
  });
  return NextResponse.json({ url });
}

export async function GET() {
  return NextResponse.json({ error: "GET not implemented; use PUT to upload first" }, { status: 501 });
}
