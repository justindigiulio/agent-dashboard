import { blob } from "@vercel/blob";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

/** We store a JSON blob per user at: profiles/{userId}.json */
export async function GET() {
  const userId = headers().get("user-id"); // Example: Adjust based on your logic
  if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 });

  const { url } = await blob.get(`profiles/${userId}.json`); // Use blob.get
  return NextResponse.json({ url });
}

export async function PUT(request: Request) {
  const userId = headers().get("user-id");
  if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 });

  const file = await request.blob();
  const { url } = await blob.put(`profiles/${userId}.json`, file);
  return NextResponse.json({ url });
}
