// app/api/drive/search/route.js
import { google } from "googleapis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      return new Response(JSON.stringify({ error: "Server not configured for Drive access" }), {
        status: 500, headers: { "content-type": "application/json" }
      });
    }

    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: (creds.private_key || "").replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    await auth.authorize();
    const drive = google.drive({ version: "v3", auth });

    // Search all files the bot can access (which, since you shared only that folder,
    // effectively means that folder + its subfolders).
    const filters = ["trashed = false"];
    if (q) {
      const esc = q.replace(/['\\]/g, "\\$&");
      filters.push(`(name contains '${esc}' or fullText contains '${esc}')`);
    }

    const files = [];
    let pageToken;
    do {
      const res = await drive.files.list({
        q: filters.join(" and "),
        fields: "nextPageToken, files(id,name,mimeType,webViewLink,iconLink,modifiedTime)",
        orderBy: "modifiedTime desc",
        pageSize: 50,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        pageToken,
      });
      files.push(...(res.data.files || []));
      pageToken = res.data.nextPageToken;
    } while (pageToken && files.length < 50);

    return new Response(JSON.stringify({ files: files.slice(0, 50) }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("Drive search failed", err);
    return new Response(JSON.stringify({ error: "Drive search failed" }), {
      status: 500, headers: { "content-type": "application/json" }
    });
  }
}
