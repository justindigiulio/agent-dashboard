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
function escapeQ(s: string) {
  return s.replace(/'/g, "\\'");
}
function docUrl(file: GFile): string {
  const mt = (file.mimeType || "").toLowerCase();
  if (mt.includes("application/vnd.google-apps.document"))
    return `https://docs.google.com/document/d/${file.id}/edit`;
  if (mt.includes("application/vnd.google-apps.spreadsheet"))
    return `https://docs.google.com/spreadsheets/d/${file.id}/edit`;
  if (mt.includes("application/vnd.google-apps.presentation"))
    return `https://docs.google.com/presentation/d/${file.id}/edit`;
  return `https://drive.google.com/file/d/${file.id}/view`;
}
function limit(text: string, n = 15000) {
  return (text || "").replace(/\u0000/g, "").slice(0, n);
}

// ---------- Google Auth ----------
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

// ---------- Search (name-first + synonyms + fallback) ----------
function tokenize(raw: string) {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);
}

function addSynonyms(terms: string[]) {
  const set = new Set(terms);
  if (terms.some(t => t.includes("sublease") || t.includes("sublet"))) {
    set.add("sublease");
    set.add("sublet");
    set.add("assignment");
    set.add("rider");
  }
  if (terms.some(t => t.includes("lease"))) {
    set.add("lease");
    set.add("rider");
    set.add("addendum");
  }
  return Array.from(set);
}

function buildQuery({ terms, folderId, mode }:{
  terms: string[];
  folderId?: string;
  mode: "name-first" | "fulltext";
}) {
  let q = `trashed = false and mimeType != 'application/vnd.google-apps.folder'`;
  if (folderId) q += ` and '${escapeQ(folderId)}' in parents`;

  const parts: string[] = [];
  for (const t of terms) {
    const e = escapeQ(t);
    if (mode === "name-first") {
      parts.push(`name contains '${e}'`);
    } else {
      parts.push(`fullText contains '${e}'`);
      parts.push(`name contains '${e}'`);
    }
  }
  if (parts.length) q += " and (" + parts.join(" or ") + ")";
  return q;
}

function scoreFile(f: GFile, terms: string[]) {
  const nm = (f.name || "").toLowerCase();
  let s = 0;
  for (const t of terms) {
    if (nm === t || nm === `${t}.pdf` || nm === `${t}.docx`) s += 12;
    if (nm.includes(t)) s += 8;
    if (nm.startsWith(t)) s += 2;
  }
  const mt = (f.mimeType || "").toLowerCase();
  if (mt.includes("pdf") || mt.includes("document")) s += 2; // prefer PDFs/Docs for forms
  // recency nudge
  const m = f.modifiedTime ? Date.parse(f.modifiedTime) : 0;
  if (m) s += Math.min(5, Math.floor((Date.now() - m) / (1000*60*60*24*365)) * -1); // newer ~ higher
  return s;
}

async function listFiles(auth: any, q: string, pageSize = 12): Promise<GFile[]> {
  const drive = google.drive({ version: "v3", auth });
  const { data } = await drive.files.list({
    q,
    fields: "files(id,name,mimeType,modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });
  return (data.files || []) as GFile[];
}

async function driveSearchSmart(auth: any, query: string): Promise<GFile[]> {
  const rawTerms = tokenize(query);
  const terms = addSynonyms(rawTerms);
  const folderId = getFolderId();

  // 1) folder-scoped, name-first
  const q1 = buildQuery({ terms, folderId, mode: "name-first" });
  let files = await listFiles(auth, q1, 15);

  // 2) if nothing obvious, folder-scoped fulltext+name
  if (!files.length) {
    const q2 = buildQuery({ terms, folderId, mode: "fulltext" });
    files = await listFiles(auth, q2, 15);
  }

  // 3) if still weak (no filename matches), broaden to global (no folder)
  const hasFileNameHit = files.some(f => {
    const nm = (f.name || "").toLowerCase();
    return terms.some(t => nm.includes(t));
  });
  if (!hasFileNameHit) {
    const q3 = buildQuery({ terms, folderId: undefined, mode: "name-first" });
    const global = await listFiles(auth, q3, 15);
    // merge & de-dupe
    const seen = new Set(files.map(f => f.id));
    for (const g of global) if (!seen.has(g.id)) files.push(g);
  }

  // rank: filename relevance first, then recency
  files.sort((a, b) => {
    const sa = scoreFile(a, terms);
    const sb = scoreFile(b, terms);
    if (sb !== sa) return sb - sa;
    const ma = a.modifiedTime ? Date.parse(a.modifiedTime) : 0;
    const mb = b.modifiedTime ? Date.parse(b.modifiedTime) : 0;
    return mb - ma;
  });

  return files.slice(0, 8);
}

// ---------- Text extractors ----------
function flattenGoogleDoc(doc: any): string {
  const out: string[] = [];
  const body = doc?.body?.content || [];
  for (const el of body) {
    if (el.paragraph?.elements) {
      out.push(
        el.paragraph.elements.map((e: any) => e.textRun?.content || "").join("").trim()
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
  return limit(out.join("\n").replace(/\n{3,}/g, "\n\n"));
}

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
async function fetchBinaryBytes(auth: any, fileId: string): Promise<Uint8Array> {
  const buf = await fetchBinaryBuffer(auth, fileId);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}
async function extractPdfText(bytes: Uint8Array): Promise<string> {
  let pdfjsLib: any;
  try {
    pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    try { await import("pdfjs-dist/legacy/build/pdf.worker.mjs"); } catch {}
  } catch {
    pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");
    try { await import("pdfjs-dist/build/pdf.worker.mjs"); } catch {}
  }
  const loadingTask = pdfjsLib.getDocument({
    data: bytes,
    disableWorker: true,
    isEvalSupported: false,
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
  return limit(all);
}

async function fetchFileText(auth: any, file: GFile): Promise<string> {
  const mt = (file.mimeType || "").toLowerCase();

  if (mt.includes("application/vnd.google-apps.document")) {
    const docs = google.docs({ version: "v1", auth });
    const { data } = await docs.documents.get({ documentId: file.id });
    return flattenGoogleDoc(data);
  }

  if (mt.includes("application/vnd.google-apps.spreadsheet")) {
    const sheets = google.sheets({ version: "v4", auth });
    const meta = await sheets.spreadsheets.get({ spreadsheetId: file.id });
    const tab = meta.data.sheets?.[0]?.properties?.title || "Sheet1";
    const vals = await sheets.spreadsheets.values.get({
      spreadsheetId: file.id,
      range: `${tab}!A1:Z200`,
      majorDimension: "ROWS",
    });
    const rows = (vals.data.values || []) as string[][];
    return limit(rows.map((r) => r.join("\t")).join("\n"));
  }

  if (mt.includes("pdf")) {
    const bytes = await fetchBinaryBytes(auth, file.id);
    if (!bytes.byteLength) return "";
    try {
      const text = await extractPdfText(bytes);
      return limit(text);
    } catch {
      return "";
    }
  }

  if (mt.includes("wordprocessingml.document")) {
    const buf = await fetchBinaryBuffer(auth, file.id);
    if (!buf?.length) return "";
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: buf });
    return limit(String(result?.value || ""));
  }

  return "";
}

// ---------- Prompt + OpenAI ----------
function buildPrompt(question: string, sources: Source[], blobs: string[]): string {
  const joined = sources
    .map((s, i) => {
      const header = `SOURCE ${i + 1}: ${s.name} — ${s.url}`;
      const body = blobs[i] && blobs[i].trim()
        ? blobs[i]
        : "(no inline text available — likely a PDF or binary; rely on the title and suggest opening the source link)";
      return `${header}\n${body}`;
    })
    .join("\n\n---\n\n");

  return `You are the DiGiulio Group Agent Assistant.

Use ONLY the information from the provided SOURCES to answer the question.
If the exact answer is not present in the source text, say you don't have enough info and point the agent to the most relevant source link by name.
Never invent policy text or legal language.
Answer briefly (2–6 sentences) and include a "Sources" list with markdown links to the items you used.

QUESTION:
${question}

SOURCES:
${joined}`;
}

async function callOpenAI(prompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("ENV_MISSING:OPENAI_API_KEY");
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
        { role: "system", content: "Be concise; cite sources with markdown links at the end." },
        { role: "user", content: prompt },
      ],
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    let code = "openai_error";
    try {
      const data = JSON.parse(text);
      code = data?.error?.code || data?.error?.type || code;
    } catch {}
    throw new Error(`OPENAI_FAILED:${code}`);
  }
  const data = JSON.parse(text);
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
      return new Response(JSON.stringify({ error: "MISSING_QUESTION" }), { status: 400 });
    }

    const auth = await getAuthJWT();
    const files = await driveSearchSmart(auth, question);

    const blobs: string[] = [];
    const sources: Source[] = [];
    for (const f of files) {
      const txt = await fetchFileText(auth, f).catch(() => "");
      blobs.push(txt);
      sources.push({
        id: f.id,
        name: f.name,
        url: docUrl(f),
        mimeType: f.mimeType,
        snippet: txt?.slice(0, 300),
      });
    }

    const prompt = buildPrompt(question, sources, blobs);
    const answer = await callOpenAI(prompt);

    return new Response(JSON.stringify({ answer, sources }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "CHAT_FAILED", detail: String(err?.message || err) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
