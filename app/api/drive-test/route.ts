// app/api/drive-test/route.ts
import { google } from "googleapis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getFolderId(): string | undefined {
  return (
    process.env.DRIVE_SHARED_FOLDER_ID ||
    process.env.DRIVE_FOLDER_ID ||
    process.env.GOOGLE_DRIVE_FOLDER_ID ||
    process.env.DRIVE_ROOT_ID ||
    undefined
  );
}

function docUrl(id: string, mimeType: string): string {
  if (mimeType.includes("document")) return `https://docs.google.com/document/d/${id}/edit`;
  if (mimeType.includes("spreadsheet")) return `https://docs.google.com/spreadsheets/d/${id}/edit`;
  if (mimeType.includes("presentation")) return `https://docs.google.com/presentation/d/${id}/edit`;
  return `https://drive.google.com/file/d/${id}/view`;
}

async function getAuthJWT() {
  const svc = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!svc) throw new Error("ENV_MISSING:GOOGLE_SERVICE_ACCOUNT_JSON");
  const creds = JSON.parse(svc);
  const jwt = new google.auth.JWT({
    email: creds.client_email,
    key: (creds.private_key || "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  await jwt.authorize();
  return jwt;
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthJWT();
    const folderId = getFolderId();

    const drive = google.drive({ version: "v3", auth });
    let q = `trashed = false and mimeType != 'application/vnd.google-apps.folder'`;
    if (folderId) q += ` and '${folderId.replace(/'/g, "\\'")}' in parents`;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);

    const { data } = await drive.files.list({
      q,
      fields: "files(id,name,mimeType,modifiedTime)",
      orderBy: "modifiedTime desc",
      pageSize: limit,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });

    const files = (data.files || []).map((f) => ({
      id: f.id!,
      name: f.name!,
      mimeType: f.mimeType!,
      modifiedTime: f.modifiedTime || null,
      url: docUrl(f.id!, f.mimeType!),
    }));

    return new Response(
      JSON.stringify({ folderId, count: files.length, files }, null, 2),
      { headers: { "content-type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: String(e?.message || e) }, null, 2),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
