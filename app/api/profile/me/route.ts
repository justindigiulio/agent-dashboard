import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { VercelBlob } from "@vercel/blob";

/** We store a JSON blob per user at: profiles/{userId}.json */
export async function GET() {
  const userId = headers().get("user-id"); // Example: Adjust based on your logic
  if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 });

  const client = VercelBlob();
  const { url } = await client.get(`profiles/${userId}.json`);
  return NextResponse.json({ url });
}

export async function PUT(request: Request) {
  const userId = headers().get("user-id");
  if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 });

  const file = await request.blob();
  const client = VercelBlob();
  const { url } = await client.put(`profiles/${userId}.json`, file);
  return NextResponse.json({ url });
}
