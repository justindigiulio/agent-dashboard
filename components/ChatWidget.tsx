"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signIn } from "next-auth/react";

type Msg = { role: "user" | "assistant"; content: string; sources?: { name: string; url: string }[] };

const BRAND = {
  green: "#0B2A1E",
  gold: "#C39A24",
  soft: "rgba(11,42,30,0.06)",
};

const LS_KEY = "dg-chat-history";

export default function ChatWidget() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! What do you need help with today?" },
  ]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // Restore/persist history
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setMessages(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [open, messages]);

  async function send() {
    const q = input.trim();
    if (!q || sending) return;
    setInput("");

    const nextMsgs = [...messages, { role: "user", content: q }];
    setMessages(nextMsgs);
    setSending(true);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMsgs.map(({ role, content }) => ({ role, content })) }),
      });

      if (!r.ok) {
        const text = await r.text().catch(() => "");
        throw new Error(text || `Request failed (${r.status})`);
      }

      const data = await r.json();
      const sources =
        (data?.sources as { name: string; url: string }[] | undefined)?.slice(0, 6) || [];

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data?.answer || "I couldn’t generate a reply.",
          sources,
        },
      ]);
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Hmm, I hit an error talking to the knowledge base. If this keeps happening, make sure the Drive folder is shared with the service account and Docs/Sheets APIs are enabled.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // Floating launcher button (always visible)
  return (
    <>
      {/* Launcher */}
      <button
        aria-label="Open Agent Assistant"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full shadow-lg transition hover:shadow-xl"
        style={{ background: BRAND.green, color: "white", boxShadow: "0 10px 24px rgba(0,0,0,.18)" }}
      >
        💬
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-40 w-[360px] max-w-[92vw] rounded-2xl border bg-white shadow-xl">
          {/* Header */}
          <div
            className="flex items-center justify-between rounded-t-2xl px-4 py-3"
            style={{ background: BRAND.soft, borderBottom: "1px solid rgba(0,0,0,0.06)" }}
          >
            <div className="font-semibold" style={{ color: BRAND.green }}>
              Agent Assistant
            </div>
            <button
              aria-label="Close"
              className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-white"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="flex h-[480px] flex-col">
            {!session?.user?.email ? (
              <div className="grid h-full place-items-center p-6 text-center">
                <div>
                  <p className="mb-3 text-sm text-gray-700">
                    Please sign in with your <b>@digiuliogroup.com</b> account to chat.
                  </p>
                  <button
                    onClick={() => signIn("google", { callbackUrl: "/" })}
                    className="rounded-lg px-4 py-2 font-medium text-white"
                    style={{ background: BRAND.green }}
                  >
                    Sign in with Google
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Messages */}
                <div ref={listRef} className="flex-1 overflow-auto p-3">
                  {messages.map((m, i) => (
                    <div key={i} className="mb-3">
                      <div
                        className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                          m.role === "user"
                            ? "bg-gray-100 text-gray-900"
                            : "bg-white text-gray-900 border"
                        }`}
                      >
                        {m.content}
                      </div>

                      {/* Sources under assistant replies */}
                      {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                        <div className="mt-1 pl-2">
                          <div className="text-[11px] font-medium text-gray-500">Sources:</div>
                          <ul className="mt-1 space-y-1 text-[11px]">
                            {m.sources.map((s, k) => (
                              <li key={k}>
                                <a
                                  href={s.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  {s.name}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}

                  {sending && (
                    <div className="mt-2 inline-block rounded-2xl border bg-white px-3 py-2 text-sm text-gray-700">
                      Thinking…
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="border-t p-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={onKeyDown}
                      placeholder="Ask about leases, forms, policies…"
                      className="h-10 flex-1 rounded-lg border px-3 text-sm outline-none focus:ring-2"
                      style={{ borderColor: "rgba(0,0,0,0.12)", boxShadow: "none" }}
                    />
                    <button
                      onClick={send}
                      disabled={sending || !input.trim()}
                      className="h-10 rounded-lg px-4 text-sm font-medium text-white disabled:opacity-60"
                      style={{ background: BRAND.green }}
                    >
                      Send
                    </button>
                  </div>
                  <div className="mt-1 px-1 text-[10px] text-gray-500">
                    Press <b>Enter</b> to send
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
