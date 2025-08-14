// app/api/drive/search/route.js
import { google } from "googleapis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function listAllFolderIds(drive, rootId) {
  const all = [rootId];
  for (let i = 0; i < all.length; i++) {
    const parent = all[i];
    let pageToken;
    do {
      const res = await drive.files.list({
        q: `'${parent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "nextPageToken, files(id)",
        pageSize: 200,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        pageToken,
      });
      (res.data.files || []).forEach(f => all.push(f.id));
      pageToken = res.data.nextPageToken;
    } while (pageToken);
  }
  return all;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").trim();
    const folderId = process.env.DRIVE_FOLDER_ID;

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !folderId) {
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

    // Crawl the folder tree so we search subfolders too.
    const folderIds = await listAllFolderIds(drive, folderId);

    const results = [];
    const term = query.toLowerCase();
    const qClause = query
      ? `(name contains '${query.replace(/['\\]/g, "\\$&")}' or fullText contains '${query.replace(/['\\]/g, "\\$&")}')`
      : "";

    for (const id of folderIds) {
      let pageToken;
      do {
        const res = await drive.files.list({
          q: [`'${id}' in parents`, "trashed=false", qClause].filter(Boolean).join(" and "),
          fields: "nextPageToken, files(id,name,mimeType,webViewLink,iconLink,modifiedTime)",
          pageSize: 100,
          includeItemsFromAllDrives: true,
          supportsAllDrives: true,
          pageToken,
        });
        results.push(...(res.data.files || []));
        pageToken = res.data.nextPageToken;
        if (results.length > 200) break; // keep it snappy
      } while (pageToken);
      if (results.length > 200) break;
    }

    // Rank: names that include the term first, then most recently updated.
    const ranked = results.sort((a, b) => {
      const an = a.name?.toLowerCase().includes(term) ? 0 : 1;
      const bn = b.name?.toLowerCase().includes(term) ? 0 : 1;
      if (an !== bn) return an - bn;
      return new Date(b.modifiedTime || 0) - new Date(a.modifiedTime || 0);
    }).slice(0, 50);

    return new Response(JSON.stringify({ files: ranked }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("Drive search failed", err);
    return new Response(JSON.stringify({ error: "Drive search failed" }), {
      status: 500, headers: { "content-type": "application/json" }
    });
  }
}
