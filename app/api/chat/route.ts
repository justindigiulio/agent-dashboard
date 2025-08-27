// app/api/chat/route.ts
import { google } from "googleapis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------- Types ----------
type GFile = { id: string; name: string; mimeType: string; modifiedTime?: string };
type Source = { id: string; name: string; url: string; mimeType: string; snippet?: string };

// ---------- Helpers ----------
function getFolderId(): string | undefined {
  return (
    process.env.DRIVE_SHARED_FOLDER_ID ||
    process.env.DRIVE_FOLDER_ID ||
    process.env.GOOGLE_DRIVE_FOLDER_ID ||
    process.env.DRIVE_ROOT_ID ||
    undefined
  );
}

function docUrl(file: GFile): string {
  if (file.mimeType.includes("document"))
    return `https://docs.google.com/document/d/${file.id}/edit`;
  if (file.mimeType.includes("spreadsheet"))
    return `https://docs.google.com/spreadsheets/d/${file.id}/edit`;
  if (file.mimeType.includes("presentation"))
    return `https://docs.google.com/presentation/d/${file.id}/edit`;
  return `https://drive.google.com/file/d/${file.id}/view`;
}

function escapeQ(s: string) {
  return s.replace(/'/g, "\\'");
}

async function getAuthJWT() {
  const svc = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!svc) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON");
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

async function driveSearch(auth: any, query: string, limit = 6): Promise<GFile[]> {
  const drive = google.drive({ version: "v3", auth });
  const terms = query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);

  let q = `trashed = false and mimeType != 'application/vnd.google-apps.folder'`;
  const folderId = getFolderId();
  if (folderId) q += ` and '${escapeQ(folderId)}' in parents`;
  if (terms.length) {
    q +=
      " and (" +
      terms.map((t) => `fullText contains '${escapeQ(t)}'`).join(" and ") +
      ")";
  }

  const { data } = await drive.files.list({
    q,
    fields: "files(id,name,mimeType,modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: limit,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });

  return (data.files || []) as GFile[];
}

function flattenGoogleDoc(doc: any): string {
  // Walk paragraphs, headings, tables (lightweight)
  const out: string[] = [];
  const body = doc?.body?.content || [];
  for (const el of body) {
    if (el.paragraph?.elements) {
      out.push(
        el.paragraph.elements
          .map((e: any) => e.textRun?.content || "")
          .join("")
          .trim()
      );
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
  return out.join("\n").replace(/\n{3,}/g, "\n\n").slice(0, 15000);
}

async function fetchFileText(auth: any, file: GFile): Promise<string> {
  if (file.mimeType.includes("application/vnd.google-apps.document")) {
    const docs = google.docs({ version: "v1", auth });
    const { data } = await docs.documents.get({ documentId: file.id });
    return flattenGoogleDoc(data);
  }
  if (file.mimeType.includes("application/vnd.google-apps.spreadsheet")) {
    const sheets = google.sheets({ version: "v4", auth });
    const meta = await sheets.spreadsheets.get({ spreadsheetId: file.id });
    const tab = meta.data.sheets?.[0]?.properties?.title || "Sheet1";
    const vals = await sheets.spreadsheets.values.get({
      spreadsheetId: file.id,
      range: `${tab}!A1:Z200`,
      majorDimension: "ROWS",
    });
    const rows = (vals.data.values || []) as string[][];
    return rows.map((r) => r.join("\t")).join("\n").slice(0, 15000);
  }
  // For PDFs/other binaries, return empty (we'll cite by title only for now)
  return "";
}

function buildPrompt(question: string, sources: Source[], blobs: string[]): string {
  // Pair each blob with its source title
  const joined = sources
    .map((s, i) => {
      const header = `SOURCE ${i + 1}: ${s.name} — ${s.url}`;
      const body = blobs[i] ? blobs[i] : "(no text extracted; use title/context only)";
      return `${header}\n${body}`;
    })
    .join("\n\n---\n\n");

  return `You are the DiGiulio Group Agent Assistant.
Answer the agent's question using ONLY the information from the provided sources. 
If the answer is not present, say you don't have enough info and suggest the most relevant source to open.
Always include a short "Sources" list with markdown links to the items you used (e.g., [Lease Checklist](url)).

Question:
${question}

SOURCES:
${joined}`;
}

async function callOpenAI(prompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Be concise, accurate, and cite sources with markdown links at the end under a 'Sources' heading.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "OpenAI API error");
  return data.choices?.[0]?.message?.content || "";
}

// ---------- Route ----------
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const messages: { role: string; content: string }[] = body?.messages || [];
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const question = (lastUser?.content || body?.question || "").slice(0, 2000).trim();
    if (!question) {
      return new Response(JSON.stringify({ error: "Missing question" }), { status: 400 });
    }

    // Search Drive
    const auth = await getAuthJWT();
    const files = await driveSearch(auth, question, 6);

    // Gather text for Google Docs/Sheets (PDFs will cite by title only)
    const textBlobs: string[] = [];
    const sources: Source[] = [];
    for (const f of files) {
      const txt = await fetchFileText(auth, f).catch(() => "");
      textBlobs.push(txt);
      sources.push({ id: f.id, name: f.name, url: docUrl(f), mimeType: f.mimeType, snippet: txt?.slice(0, 300) });
    }

    const prompt = buildPrompt(question, sources, textBlobs);
    const answer = await callOpenAI(prompt);

    return new Response(JSON.stringify({ answer, sources }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: "Chat failed",
        detail: String(err?.message || err),
      }),
      { status: 500 }
    );
  }
}
