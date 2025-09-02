// app/api/drive-test/route.ts
import { google } from "googleapis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);
    const term = (searchParams.get("q") || "").trim().toLowerCase();

    const drive = google.drive({ version: "v3", auth });

    let q = `trashed = false and mimeType != 'application/vnd.google-apps.folder'`;
    if (term) {
      const toks = term.split(/\s+/).filter(Boolean).slice(0, 5);
      const parts: string[] = [];
      for (const t of toks) {
        const e = t.replace(/'/g, "\\'");
        parts.push(`fullText contains '${e}'`);
        parts.push(`name contains '${e}'`);
      }
      q += " and (" + parts.join(" or ") + ")";
    }

    const { data } = await drive.files.list({
      q,
      fields: "files(id,name,mimeType,modifiedTime)",
      orderBy: "modifiedTime desc",
      pageSize: limit,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      corpora: "user",
      spaces: "drive",
    });

    const files = (data.files || []).map((f) => ({
      id: f.id!,
      name: f.name!,
      mimeType: f.mimeType!,
      modifiedTime: f.modifiedTime || null,
      url: docUrl(f.id!, f.mimeType!),
    }));

    return new Response(JSON.stringify({ count: files.length, files }, null, 2), {
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }, null, 2), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
