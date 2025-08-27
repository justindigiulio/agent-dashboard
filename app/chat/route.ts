// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

type GFile = {
  id: string;
  name: string;
  webViewLink: string;
  mimeType: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const incoming = Array.isArray(body?.messages) ? body.messages : [];
    const userMsg =
      [...incoming].reverse().find((m: any) => m?.role === 'user')?.content?.toString().slice(0, 1000) ||
      '';

    // Build a base URL we can use to call our own API
    const h = headers();
    const host = h.get('x-forwarded-host') || h.get('host') || '';
    const proto = h.get('x-forwarded-proto') || 'https';
    const base = process.env.NEXTAUTH_URL || `${proto}://${host}`;

    // 1) Use your existing Drive search to get candidate docs
    let files: GFile[] = [];
    try {
      const r = await fetch(`${base}/api/drive/search?q=${encodeURIComponent(userMsg)}`, {
        cache: 'no-store',
      });
      const j = await r.json();
      files = (j?.files || []).slice(0, 6);
    } catch {
      // ignore — we'll still try to answer
    }

    const sources = files.map((f) => ({
      id: f.id,
      name: f.name,
      url: f.webViewLink,
      mimeType: f.mimeType,
    }));

    // 2) If no OpenAI key, return a graceful fallback
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const text = sources.length
        ? `I found ${sources.length} possibly relevant documents:\n` +
          sources.map((s, i) => `${i + 1}. ${s.name}`).join('\n') +
          `\n\nSet the OPENAI_API_KEY env var to enable full answers.`
        : `I couldn't search documents. Ensure /api/drive/search works and OPENAI_API_KEY is set.`;
      return NextResponse.json({ answer: text, sources }, { status: 200 });
    }

    // 3) Ask OpenAI with the source list as context
    const context = sources.map((s, i) => `[${i + 1}] ${s.name} – ${s.url}`).join('\n');
    const system =
      'You are the DiGiulio Group Agent Assistant. Use the provided context (Drive file names/links) to answer real-estate questions. Be concise. When you rely on a source, cite it like [1], [2]. If unsure, say so and suggest which doc looks relevant.';

    const payload = {
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `Question: ${userMsg}\n\nPotential sources:\n${context}`,
        },
      ],
    };

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return NextResponse.json({ answer: `Model error: ${errText}`, sources }, { status: 200 });
    }

    const data = await resp.json();
    const answer: string =
      data?.choices?.[0]?.message?.content || 'Sorry, I could not produce an answer.';

    return NextResponse.json({ answer, sources }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Chat error' }, { status: 500 });
  }
}
