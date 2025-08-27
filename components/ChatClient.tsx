'use client';

import { useEffect, useRef, useState } from 'react';

type Source = { id: string; name: string; url: string; mimeType: string; snippet?: string };
type Msg = { role: 'user' | 'assistant'; content: string; sources?: Source[] };

export default function ChatClient() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        "Hi! Ask me about leases, application docs, REBNY forms, building policies, or anything in your shared Drive. I'll answer and cite the sources I used.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  function reset() {
    setMessages([
      {
        role: 'assistant',
        content:
          "New chat started. Ask me about any document in your shared Drive — I'll include links to open the sources.",
      },
    ]);
    setInput('');
    taRef.current?.focus();
  }

  async function send() {
    const question = input.trim();
    if (!question || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: question }]);
    setLoading(true);

    try {
      const body = { messages: messages.concat({ role: 'user', content: question }) };
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Chat failed');

      const answer: string = data.answer || 'Sorry — no answer returned.';
      const sources: Source[] = data.sources || [];
      setMessages((m) => [...m, { role: 'assistant', content: answer, sources }]);
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content:
            `I hit an error: ${err?.message || err}. If this keeps happening, make sure the Drive folder is shared with the service account and the Sheets/Docs APIs are enabled.`,
        },
      ]);
    } finally {
      setLoading(false);
      taRef.current?.focus();
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Agent Assistant (beta)</h1>
        <button
          onClick={reset}
          className="text-sm rounded-lg border px-3 py-1.5 hover:bg-gray-50"
          title="Start a new chat"
        >
          New chat
        </button>
      </div>

      {/* Messages */}
      <div className="mb-4 space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-2xl border p-4 ${
              m.role === 'user' ? 'bg-white' : 'bg-gray-50'
            }`}
          >
            <div className="mb-1 text-xs text-gray-500">
              {m.role === 'user' ? 'You' : 'Assistant'}
            </div>
            <div className="whitespace-pre-wrap text-[15px] leading-6">{m.content}</div>

            {m.sources && m.sources.length > 0 && (
              <div className="mt-3 border-t pt-3">
                <div className="mb-1 text-xs font-medium text-gray-500">Sources</div>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {m.sources.map((s, idx) => (
                    <li key={s.id + idx}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        {s.name}
                      </a>
                      {s.snippet ? (
                        <span className="text-gray-500"> — {s.snippet.slice(0, 120)}…</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="rounded-2xl border bg-gray-50 p-4 text-sm text-gray-600">
            Thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="rounded-2xl border p-3">
        <textarea
          ref={taRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          rows={3}
          placeholder="e.g., What are the required docs for a condo sublet? Cite the lease rider and checklist."
          className="w-full resize-none outline-none"
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Press <kbd className="rounded border px-1">Enter</kbd> to send, <kbd className="rounded border px-1">Shift</kbd>+<kbd className="rounded border px-1">Enter</kbd> for a new line
          </div>
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="rounded-lg bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
