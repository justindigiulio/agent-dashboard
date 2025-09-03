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
    scopes: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/documents.readonly",
      "https://www.googleapis.com/auth/spreadsheets.readonly",
    ],
  });
  await jwt.authorize();
  return jwt;
}

// Stream download bytes from Drive -> Buffer
async function fetchBinaryBuffer(auth: any, fileId: string): Promise<Buffer> {
  const drive = google.drive({ version: "v3", auth });
  const res: any = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "stream" } as any
  );
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    res.data.on("data", (d: Buffer) => chunks.push(d));
    res.data.on("end", () => resolve());
    res.data.on("error", reject);
  });
  return Buffer.concat(chunks);
}

// Buffer -> Uint8Array for pdfjs
async function fetchBinaryBytes(auth: any, fileId: string): Promise<Uint8Array> {
  const buf = await fetchBinaryBuffer(auth, fileId);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

// ---- Extractors ----
async function extractPdfText(bytes: Uint8Array): Promise<string> {
  let pdfjsLib: any;
  try {
    pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  } catch {
    pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");
  }

  // IMPORTANT: run without a worker in serverless
  const loadingTask = pdfjsLib.getDocument({
    data: bytes,
    disableWorker: true,
    isEvalSupported: false, // safer in server envs
  });
  const doc = await loadingTask.promise;

  const maxPages = Math.min(doc.numPages, 8);
  let all = "";
  for (let i = 1; i <= maxPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const line = (content.items || [])
      .map((it: any) => (it?.str ?? it?.text ?? ""))
      .join(" ");
    all += line + "\n";
  }
  return all;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = (searchParams.get("id") || "").trim();
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing ?id=" }, null, 2), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const auth = await getAuthJWT();
    const drive = google.drive({ version: "v3", auth });

    // Metadata
    const meta = await drive.files.get({
      fileId: id,
      fields: "id,name,mimeType,modifiedTime,size",
      supportsAllDrives: true,
    });
    const f = meta.data as {
      id?: string;
      name?: string;
      mimeType?: string;
      modifiedTime?: string;
      size?: string;
    };

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
        spreadsheetId: id,
        range: `${tab}!A1:Z200`,
        majorDimension: "ROWS",
      });
      const rows = (vals.data.values || []) as string[][];
      text = rows.map((r) => r.join("\t")).join("\n");
    } else if (mime.includes("pdf")) {
      const bytes = await fetchBinaryBytes(auth, id);
      if (!bytes || bytes.byteLength === 0) {
        note = "Downloaded 0 bytes from Drive (permission or download issue).";
      } else {
        try {
          text = await extractPdfText(bytes);
          if (!text.trim()) note = "No extractable text; likely a scanned/image-only PDF.";
        } catch (e: any) {
          note = "PDF parse failed: " + String(e?.message || e);
        }
      }
    } else if (mime.includes("wordprocessingml.document")) {
      const buf = await fetchBinaryBuffer(auth, id);
      if (!buf || buf.length === 0) {
        note = "Downloaded 0 bytes from Drive (permission or download issue).";
      } else {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer: buf });
        text = String(result?.value || "");
      }
    } else {
      note = "Unsupported binary for inline text (image/video/other).";
    }

    return new Response(
      JSON.stringify(
        {
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          size: f.size || null,
          modifiedTime: f.modifiedTime || null,
          url: docUrl(id, f.mimeType || ""),
          textLength: (text || "").length,
          preview: limit(text),
          note,
        },
        null,
        2
      ),
      { headers: { "content-type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }, null, 2), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
