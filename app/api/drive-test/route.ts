// app/api/chat/route.ts
import { google } from "googleapis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GFile = { id: string; name: string; mimeType: string; modifiedTime?: string };
type Source = { id: string; name: string; url: string; mimeType: string; snippet?: string };

function getFolderId(): string | undefined {
  return (
    process.env.DRIVE_SHARED_FOLDER_ID ||
    process.env.DRIVE_FOLDER_ID ||
    process.env.GOOGLE_DRIVE_FOLDER_ID ||
    process.env.DRIVE_ROOT_ID ||
    undefined
  );
}
function escapeQ(s: string) { return s.replace(/'/g, "\\'"); }
function limit(text: string, n = 15000) { return (text || "").replace(/\u0000/g, "").slice(0, n); }

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

// ---------- Query building ----------
function tokens(q: string) {
  return q.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean).slice(0, 6);
}
function addSynonyms(terms: string[]) {
  const set = new Set(terms);
  // common real-estate doc synonyms
  if (terms.some(t => t.includes("lease"))) { set.add("rider"); set.add("addendum"); set.add("agreement"); }
  if (terms.some(t => t.includes("sublease") || t.includes("sublet"))) { set.add("sublease"); set.add("sublet"); set.add("assignment"); }
  if (terms.some(t => t.includes("rebny"))) { set.add("rebny"); set.add("real estate board of new york"); }
  return Array.from(set);
}
function nameClauseAny(parts: string[]) {
  if (!parts.length) return "";
  return "(" + parts.map((t) => `name contains '${escapeQ(t)}'`).join(" or ") + ")";
}
function fullTextClauseAll(parts: string[]) {
  if (!parts.length) return "";
  return "(" + parts.map((t) => `fullText contains '${escapeQ(t)}'`).join(" and ") + ")";
}

async function listFiles(auth: any, q: string, where: string, pageSize = 20) {
  const drive = google.drive({ version: "v3", auth });
  const { data } = await drive.files.list({
    q,
    fields: "files(id,name,mimeType,modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    corpora: "allDrives",
    spaces: "drive",
  });
  const files = (data.files || []) as GFile[];
  (files as any).where = where;
  return files;
}

function mimeIsDocLike(mt: string) {
  const m = mt.toLowerCase();
  return (
    m.includes("pdf") ||
    m.includes("application/vnd.google-apps.document") ||
    m.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document") || // .docx
    m.includes("application/msword") ||
    m.includes("application/vnd.google-apps.spreadsheet")
  );
}
function mimeIsNoise(mt: string) {
  const m = mt.toLowerCase();
  return m.startsWith("video/") || m.startsWith("image/") || m.includes("quicktime");
}

// rank by filename relevance (+big boosts for lease-y terms), then doc-like mime, then recency
function scoreFile(f: GFile, terms: string[]) {
  const nm = (f.name || "").toLowerCase();
  let s = 0;
  for (const t of terms) {
    if (!t) continue;
    if (nm === t || nm === `${t}.pdf` || nm === `${t}.docx`) s += 20;
    if (nm.includes(t)) s += 12;
    if (nm.startsWith(t)) s += 4;
  }
  // targeted boosts
  if (/\brebny\b/.test(nm)) s += 18;
  if (/\b(sub)?lease\b/.test(nm)) s += 15;
  if (/\brider\b/.test(nm)) s += 8;
  if (/\bagreement|template|form\b/.test(nm)) s += 6;

  const mt = (f.mimeType || "");
  if (mimeIsDocLike(mt)) s += 6;
  if (mimeIsNoise(mt) && (terms.includes("lease") || terms.includes("sublease") || terms.includes("rebny"))) s -= 40;

  // light recency nudge
  const m = f.modifiedTime ? Date.parse(f.modifiedTime) : 0;
  if (m) s += Math.max(-3, Math.min(3, Math.round((Date.now() - m) / (1000 * 60 * 60 * 24 * 365)) * -0.5));
  return s;
}

async function driveSearchSmart(auth: any, query: string): Promise<GFile[]> {
  const raw = tokens(query);
  const terms = addSynonyms(raw);
  const folderId = getFolderId();
  const nameAny = nameClauseAny(terms);
  const fullAll = fullTextClauseAll(terms);

  const results: GFile[] = [];
  const pushUnique = (arr: GFile[]) => {
    const seen = new Set(results.map((r) => r.id));
    for (const f of arr) if (!seen.has(f.id)) results.push(f);
  };

  // Tier A: in-folder (name), then in-folder (fullText)
  if (folderId) {
    if (nameAny) {
      const q1 = `trashed = false and '${escapeQ(folderId)}' in parents and ${nameAny}`;
      pushUnique(await listFiles(auth, q1, "inFolder:name"));
    }
    if (fullAll) {
      const q2 = `trashed = false and '${escapeQ(folderId)}' in parents and ${fullAll}`;
      pushUnique(await listFiles(auth, q2, "inFolder:fullText"));
    }
  }

  // Tier B: shared-with-me (name), then (fullText)
  if (nameAny) {
    const q3 = `trashed = false and sharedWithMe = true and ${nameAny}`;
    pushUnique(await listFiles(auth, q3, "sharedWithMe:name"));
  }
  if (fullAll) {
    const q4 = `trashed = false and sharedWithMe = true and ${fullAll}`;
    pushUnique(await listFiles(auth, q4, "sharedWithMe:fullText"));
  }

  // Tier C: global (name), then (fullText)
  if (nameAny) {
    const q5 = `trashed = false and ${nameAny}`;
    pushUnique(await listFiles(auth, q5, "global:name"));
  }
  if (fullAll) {
    const q6 = `trashed = false and ${fullAll}`;
    pushUnique(await listFiles(auth, q6, "global:fullText"));
  }

  // If the query smells like a doc request, heavily prefer doc-like mimes
  const docRequest = terms.some((t) =>
    /(lease|sublease|rider|agreement|template|form|w9|w-9|commission|nda|disclosure)/.test(t)
  );

  const ranked = results
    .filter((f) => (docRequest ? mimeIsDocLike(f.mimeType || "") : true))
    .sort((a, b) => {
      const sa = scoreFile(a, terms);
      const sb = scoreFile(b, terms);
      if (sb !== sa) return sb - sa;
      const ma = a.modifiedTime ? Date.parse(a.modifiedTime) : 0;
      const mb = b.modifiedTime ? Date.parse(b.modifiedTime) : 0;
      return mb - ma;
    });

  return ranked.slice(0, 8);
}

// ---------- Text extraction ----------
function flattenGoogleDoc(doc: any): string {
  const out: string[] = [];
  const body = doc?.body?.content || [];
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
  const loadingTask = pdfjsLib.getDocument({ data: bytes, disableWorker: true, isEvalSupported: false });
  const doc = await loadingTask.promise;
  const maxPages = Math.min(doc.numPages, 8);
  let all = "";
  for (let i = 1; i <= maxPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const line = (content.items || []).map((it: any) => (it?.str ?? it?.text ?? "")).join(" ");
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
    try { return limit(await extractPdfText(bytes)); } catch { return ""; }
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
  const joined = sources.map((s, i) => {
    const header = `SOURCE ${i + 1}: ${s.name} — ${s.url}`;
    const body = blobs[i]?.trim()
      ? blobs[i]
      : "(no inline text available — likely a PDF or binary; rely on the title and suggest opening the source link)";
    return `${header}\n${body}`;
  }).join("\n\n---\n\n");

  return `You are the DiGiulio Group Agent Assistant.
Use ONLY the information from the provided SOURCES to answer the question.
If the exact answer is not present in the source text, say you don't have enough info and point the agent to the most relevant source link by exact name.
Never invent policy text or legal language.
Answer briefly (2–6 sentences) and include a "Sources" list with markdown links.

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
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
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
    try { const data = JSON.parse(text); code = data?.error?.code || data?.error?.type || code; } catch {}
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
      sources.push({ id: f.id, name: f.name, url: docUrl(f), mimeType: f.mimeType, snippet: txt?.slice(0, 300) });
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
