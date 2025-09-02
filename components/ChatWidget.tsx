'use client';

import { useState } from 'react';

type Source = { name: string; url: string };

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [reply, setReply] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim() || loading) return;

    setLoading(true);
    setErr(null);
    setReply(null);
    setSources([]);

    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: q.trim() }] }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.detail || data?.error || `Request failed (${r.status})`);

      setReply(data.answer || '(no answer)');
      setSources(Array.isArray(data.sources) ? data.sources.slice(0, 8) : []);
    } catch (e: any) {
      const msg = String(e?.message || e || 'Error');
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 rounded-full px-4 py-2 shadow-lg text-white"
        style={{ background: '#0B2A1E' }}
        aria-label="Open agent assistant"
      >
        {open ? 'Close' : 'Ask Agent Assistant'}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-5 w-[360px] max-w-[92vw] rounded-2xl border bg-white p-4 shadow-2xl">
          <h3 className="mb-2 text-lg font-semibold">Agent Assistant</h3>

          <form onSubmit={ask} className="space-y-2">
            <textarea
              value={q}
              onChange={(e) => setQ(e.target.value)}
              rows={3}
              className="w-full rounded border p-2 text-sm"
              placeholder="What do you need help with?"
            />
            <button
              disabled={loading || !q.trim()}
              className="w-full rounded bg-black/80 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {loading ? 'Thinking…' : 'Send'}
            </button>
          </form>

          {err && (
            <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {err.includes('quota') || err.includes('insufficient_quota')
                ? <>Billing/Quota issue on your OpenAI project. Add a card or raise the project budget, then try again.</>
                : err}
            </div>
          )}

          {reply && (
            <div className="mt-3 max-h-56 overflow-auto rounded border bg-gray-50 p-2 text-sm whitespace-pre-wrap">
              {reply}
            </div>
          )}

          {sources.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-gray-700">Sources</div>
              <ul className="mt-1 space-y-1 text-xs">
                {sources.map((s, i) => (
                  <li key={i}>
                    <a className="text-blue-600 hover:underline" href={s.url} target="_blank" rel="noreferrer">
                      {s.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </>
  );
}
