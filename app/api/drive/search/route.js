// app/api/drive/search/route.js
import { google } from "googleapis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").trim();
    const folderId = process.env.DRIVE_FOLDER_ID;

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !folderId) {
      return new Response(
        JSON.stringify({ error: "Server not configured for Drive access" }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: (creds.private_key || "").replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    await auth.authorize();

    const drive = google.drive({ version: "v3", auth });

    const qParts = [`'${folderId}' in parents`, "trashed = false"];
    if (query) {
      const escaped = query.replace(/['\\]/g, "\\$&");
      qParts.push(`(name contains '${escaped}' or fullText contains '${escaped}')`);
    }

    const resp = await drive.files.list({
      q: qParts.join(" and "),
      fields: "files(id,name,mimeType,webViewLink,iconLink,modifiedTime)",
      pageSize: 10,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });

    return new Response(JSON.stringify({ files: resp.data.files || [] }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("Drive search failed", err);
    return new Response(JSON.stringify({ error: "Drive search failed" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
