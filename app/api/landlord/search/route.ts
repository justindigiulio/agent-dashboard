// app/api/landlord/search/route.ts
import { google } from "googleapis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  received_at?: string;
  source_email?: string;
  subject?: string;
  address?: string;
  unit?: string;
  borough?: string;
  neighborhood?: string;
  type?: string;          // rental | sale
  price?: number | "";
  beds?: number | "";
  baths?: number | "";
  sqft?: number | "";
  fee?: boolean | "";     // true | false | ""
  pets?: string;          // yes | no | case-by-case | ""
  notes?: string;
  images?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  message_id?: string;
};

function toNumber(v: any) {
  if (v === "" || v === undefined || v === null) return "";
  const n = Number(String(v).replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : "";
}
function toBool(v: any) {
  const s = String(v).trim().toLowerCase();
  if (["true", "yes"].includes(s)) return true;
  if (["false", "no"].includes(s)) return false;
  return "";
}

export async function GET(req: Request) {
  try {
    const sheetId = process.env.LANDLORD_SHEET_ID;
    const svc = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!sheetId || !svc) {
      return new Response(JSON.stringify({ error: "Server missing LANDLORD_SHEET_ID or GOOGLE_SERVICE_ACCOUNT_JSON" }), { status: 500 });
    }

    const creds = JSON.parse(svc);
    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: (creds.private_key || "").replace(/\\n/g, "\n"),
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    });
    await auth.authorize();

    const sheets = google.sheets({ version: "v4", auth });

    // Find first worksheet name automatically
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const tab =
      meta.data.sheets?.[0]?.properties?.title || "Sheet1";

    // Read rows A2:T (headers are in row 1)
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${tab}!A2:T`,
      majorDimension: "ROWS",
    });

    const rows = (res.data.values || []) as any[][];
    const data: Row[] = rows.map((r) => ({
      received_at: r[0],
      source_email: r[1],
      subject: r[2],
      address: r[3],
      unit: r[4],
      borough: r[5],
      neighborhood: r[6],
      type: (r[7] || "").toLowerCase(),
      price: toNumber(r[8]),
      beds: toNumber(r[9]),
      baths: toNumber(r[10]),
      sqft: toNumber(r[11]),
      fee: toBool(r[12]),
      pets: (r[13] || "").toLowerCase(),
      notes: r[14],
      images: r[15],
      contact_name: r[16],
      contact_phone: r[17],
      contact_email: r[18],
      message_id: r[19],
    }));

    // Filters
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").toLowerCase().trim();
    const type = (searchParams.get("type") || "").toLowerCase(); // rental|sale
    const borough = (searchParams.get("borough") || "").toLowerCase();
    const minPrice = Number(searchParams.get("min_price") || "") || 0;
    const maxPrice = Number(searchParams.get("max_price") || "") || Number.MAX_SAFE_INTEGER;
    const beds = Number(searchParams.get("beds") || "") || 0;
    const baths = Number(searchParams.get("baths") || "") || 0;
    const fee = (searchParams.get("fee") || "").toLowerCase(); // no_fee|any
    const pets = (searchParams.get("pets") || "").toLowerCase(); // yes|no|case-by-case

    const filtered = data.filter((l) => {
      if (q) {
        const hay = `${l.address || ""} ${l.neighborhood || ""} ${l.subject || ""} ${l.source_email || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (type && l.type !== type) return false;
      if (borough && (l.borough || "").toLowerCase() !== borough) return false;
      const price = typeof l.price === "number" ? l.price : 0;
      if (price && (price < minPrice || price > maxPrice)) return false;
      const lbeds = typeof l.beds === "number" ? l.beds : 0;
      const lbaths = typeof l.baths === "number" ? l.baths : 0;
      if (beds && lbeds < beds) return false;
      if (baths && lbaths < baths) return false;
      if (fee === "no_fee" && l.fee === true) return false;
      if (pets && (l.pets || "") !== pets) return false;
      return true;
    });

    // Sort: newest email first, then lowest price
    filtered.sort((a, b) => {
      const ad = a.received_at ? new Date(a.received_at).getTime() : 0;
      const bd = b.received_at ? new Date(b.received_at).getTime() : 0;
      if (bd !== ad) return bd - ad;
      const ap = typeof a.price === "number" ? a.price : Infinity;
      const bp = typeof b.price === "number" ? b.price : Infinity;
      return ap - bp;
    });

    return new Response(JSON.stringify({ total: filtered.length, results: filtered.slice(0, 200) }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    const msg = String(err?.message || err);
    const hint =
      msg.includes("Google Sheets API") ? "Enable the Google Sheets API in your Google Cloud project." :
      msg.includes("insufficient") || msg.includes("permission") ? "Share the sheet with the service account email as Editor." :
      undefined;
    return new Response(JSON.stringify({ error: "Landlord sheet read failed", detail: msg, hint }), { status: 500 });
  }
}
