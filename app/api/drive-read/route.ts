// app/api/drive-read/route.ts
import { google } from "googleapis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function limit(text: string, n = 1500) {
  return (text || "").replace(/\u0000/g, "").slice(0, n);
}
function docUrl(id: string, mimeType: string): string {
  if (mimeType.includes("application/vnd.google-apps.document"))
    return `https://docs.google.com/document/d/${id}/edit`;
  if (mimeType.includes("application/vnd.google-apps.spreadsheet"))
    return `https://docs.google.com/spreadsheets/d/${id}/edit`;
  if (mimeType.includes("application/vnd.google-apps.presentation"))
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
    scopes: ["https://www.googleapis.com/auth/drive.readonly", "https://www.googleapis.com/auth/documents.readonly", "https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  await jwt.authorize();
  return jwt;
}

async function fetchBinary(auth: any, fileId: string): Promise<Buffer> {
  const drive = google.drive({ version: "v3", auth });
  const res: any = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" } as any
  );
  const arr = res.data as ArrayBuffer;
  return Buffer.from(arr as any);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = (searchParams.get("id") || "").trim();
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing ?id=" }, null, 2), {
        status: 400, headers: { "content-type": "application/json" }
      });
    }

    const auth = await getAuthJWT();
    const drive = google.drive({ version: "v3", auth });

    // Get metadata first
    const meta = await drive.files.get({
      fileId: id,
      fields: "id,name,mimeType,modifiedTime,size",
      supportsAllDrives: true
    });
    const f = meta.data as { id?: string; name?: string; mimeType?: string; modifiedTime?: string; size?: string };

    const mime = (f.mimeType || "").toLowerCase();
    let text = "";
    let note = "";

    if (mime.includes("application/vnd.google-apps.document")) {
      const docs = google.docs({ version: "v1", auth });
      const { data } = await docs.documents.get({ documentId: id });
      const out: string[] = [];
      const body = (data as any)?.body?.content || [];
      for (const el of body) {
        if (el.paragraph?.elements) {
          out.push(el.paragraph.elements.map((e: any) => e.textRun?.content || "").join("").trim());
        } else if (el.table?.tableRows) {
          for (const row of el.table.tableRows) {
            const cells = row.tableCells?.map((c: any) =>
              (c.content || [])
                .map((p: any) =>
                  (p.paragraph?.elements || [])
                    .map((e: any) => e.textRun?.content || "")
                    .join("")
                )
                .join(" ")
            );
            if (cells?.length) out.push(cells.join(" | "));
          }
        }
      }
      text = out.join("\n").replace(/\n{3,}/g, "\n\n");
    } else if (mime.includes("application/vnd.google-apps.spreadsheet")) {
      const sheets = google.sheets({ version: "v4", auth });
      const ssMeta = await sheets.spreadsheets.get({ spreadsheetId: id });
      const tab = ssMeta.data.sheets?.[0]?.properties?.title || "Sheet1";
      const vals = await sheets.spreadsheets.values.get({
        spreadsheetId: id, range: `${tab}!A1:Z200`, majorDimension: "ROWS"
      });
      const rows = (vals.data.values || []) as string[][];
      text = rows.map((r) => r.join("\t")).join("\n");
    } else if (mime.includes("pdf")) {
      const buf = await fetchBinary(auth, id);
      const pdfParse = (await import("pdf-parse")).default as any;
      const data = await pdfParse(buf);
      text = String(data?.text || "");
      if (!text.trim()) note = "PDF appears to have no extractable text (likely scanned/images).";
    } else if (mime.includes("wordprocessingml.document")) {
      const buf = await fetchBinary(auth, id);
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: buf });
      text = String(result?.value || "");
    } else {
      note = "Unsupported binary for inline text (image/video/other).";
    }

    return new Response(JSON.stringify({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size || null,
      modifiedTime: f.modifiedTime || null,
      url: docUrl(id, f.mimeType || ""),
      textLength: text.length,
      preview: limit(text),
      note
    }, null, 2), { headers: { "content-type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }, null, 2), {
      status: 500, headers: { "content-type": "application/json" }
    });
  }
}
