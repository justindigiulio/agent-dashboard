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

function escapeQ(s: string) {
  return s.replace(/'/g, "\\'");
}

function docUrl(id: string, mimeType: string): string {
  const mt = (mimeType || "").toLowerCase();
  if (mt.includes("application/vnd.google-apps.document"))
    return `https://docs.google.com/document/d/${id}/edit`;
  if (mt.includes("application/vnd.google-apps.spreadsheet"))
    return `https://docs.google.com/spreadsheets/d/${id}/edit`;
  if (mt.includes("application/vnd.google-apps.presentation"))
    return `https://docs.google.com/presentation/d/${id}/edit`;
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

function tokens(q: string) {
  return q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);
}
function nameQuery(parts: string[]) {
  if (!parts.length) return "";
  return "(" + parts.map((t) => `name contains '${escapeQ(t)}'`).join(" or ") + ")";
}

async function listFiles(
  auth: any,
  q: string,
  opts?: { pageSize?: number; corpora?: "user" | "allDrives"; where?: string }
) {
  const drive = google.drive({ version: "v3", auth });
  const { data } = await drive.files.list({
    q,
    fields: "files(id,name,mimeType,modifiedTime,owners,driveId)",
    orderBy: "modifiedTime desc",
    pageSize: opts?.pageSize ?? 25,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    corpora: opts?.corpora ?? "allDrives",
    spaces: "drive",
  });

  return (data.files || []).map((f) => ({
    id: f.id!,
    name: f.name!,
    mimeType: f.mimeType!,
    modifiedTime: f.modifiedTime || null,
    url: docUrl(f.id!, f.mimeType!),
    where: opts?.where || "unknown",
  }));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 50);
    const parts = tokens(q);
    const nameOnly = nameQuery(parts);
    const folderId = getFolderId();

    const buckets: Record<string, any[]> = {
      inFolder: [],
      sharedWithMe: [],
      global: [],
    };

    // 1) In-folder (name-first)
    if (folderId) {
      const q1 =
        `trashed = false and '${escapeQ(folderId)}' in parents` +
        (nameOnly ? ` and ${nameOnly}` : "");
      buckets.inFolder = await listFiles(req, q1, {
        pageSize: limit,
        corpora: "allDrives",
        where: "inFolder",
      } as any);
    }

    // 2) Shared-with-me (name-first)
    {
      const q2 =
        `trashed = false and sharedWithMe = true` +
        (nameOnly ? ` and ${nameOnly}` : "");
      buckets.sharedWithMe = await listFiles(req, q2, {
        pageSize: limit,
        corpora: "allDrives",
        where: "sharedWithMe",
      } as any);
    }

    // 3) Global/allDrives (name-first, no parent)
    {
      const q3 =
        `trashed = false` + (nameOnly ? ` and ${nameOnly}` : "");
      buckets.global = await listFiles(req, q3, {
        pageSize: limit,
        corpora: "allDrives",
        where: "global",
      } as any);
    }

    // De-dupe preserving priority: inFolder > sharedWithMe > global
    const seen = new Set<string>();
    const merged: any[] = [];
    for (const key of ["inFolder", "sharedWithMe", "global"]) {
      for (const f of buckets[key]) {
        if (!seen.has(f.id)) {
          seen.add(f.id);
          merged.push(f);
        }
      }
    }

    return new Response(
      JSON.stringify(
        {
          folderId: folderId || null,
          query: q,
          counts: {
            inFolder: buckets.inFolder.length,
            sharedWithMe: buckets.sharedWithMe.length,
            global: buckets.global.length,
            merged: merged.length,
          },
          files: merged.slice(0, limit),
          buckets,
        },
        null,
        2
      ),
      { headers: { "content-type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: String(e?.message || e) }, null, 2),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
