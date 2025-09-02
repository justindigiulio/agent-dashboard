'use client';

import { useState } from 'react';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setReply(null);
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: q }] }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.detail || data?.error || 'Chat failed');
      setReply(data.answer || '(no answer)');
    } catch (e: any) {
      setErr(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* launcher button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 rounded-full px-4 py-2 shadow-lg text-white"
        style={{ background: '#0B2A1E' }}
        aria-label="Open agent assistant"
      >
        {open ? 'Close' : 'Ask Agent Assistant'}
      </button>

      {/* panel */}
      {open && (
        <div className="fixed bottom-20 right-5 w-[340px] max-w-[90vw] rounded-2xl border bg-white p-4 shadow-2xl">
          <h3 className="mb-2 text-lg font-semibold">Agent Assistant</h3>
          <form onSubmit={ask} className="space-y-2">
            <textarea
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded border p-2 text-sm"
              rows={3}
              placeholder="What do you need help with?"
            />
            <button
              disabled={loading || !q.trim()}
              className="w-full rounded bg-black/80 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {loading ? 'Thinking…' : 'Send'}
            </button>
          </form>
          {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
          {reply && (
            <div className="mt-3 max-h-56 overflow-auto rounded border bg-gray-50 p-2 text-sm whitespace-pre-wrap">
              {reply}
            </div>
          )}
        </div>
      )}
    </>
  );
}
