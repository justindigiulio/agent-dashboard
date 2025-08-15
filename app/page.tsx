'use client';
import { useEffect, useState } from 'react';

type Session = { user?: { email?: string } } | null;

type GFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  iconLink?: string;
  modifiedTime?: string;
};

export default function Home() {
  // 1) Get session by calling NextAuth's session endpoint (no React hooks)
  const [session, setSession] = useState<Session>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/auth/session', { cache: 'no-store' });
        const d = await r.json().catch(() => null);
        setSession(d && d.user ? d : null);
      } finally {
        setLoadingSession(false);
      }
    })();
  }, []);

  if (loadingSession) return <main className="min-h-screen grid place-items-center p-6">Loading…</main>;

  if (!session?.user?.email) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="border rounded-xl p-6 max-w-md w-full text-center">
          <h1 className="text-2xl font-semibold mb-2">DiGiulio Agent Dashboard</h1>
          <p className="text-gray-600 mb-6">Sign in with your <b>@digiuliogroup.com</b> account to continue.</p>
          <a href="/api/auth/signin?callbackUrl=/" className="inline-block border rounded px-4 py-2">
            Sign in with Google
          </a>
        </div>
      </main>
    );
  }

  // 2) Simple Drive search UI
  const [q, setQ] = useState('lease');
  const [files, setFiles] = useState<GFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/drive/search?q=${encodeURIComponent(q)}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Search failed');
      setFiles(data.files || []);
    } catch (err: any) {
      setError(err.message || 'Search failed');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Agent Dashboard — Docs Search</h1>
        <div className="text-sm text-gray-600 flex items-center gap-3">
          <span>{session.user?.email}</span>
          <a className="border rounded px-3 py-1" href="/api/auth/signout?callbackUrl=/">Sign out</a>
        </div>
      </div>

      <form onSubmit={search} className="flex gap-2 mb-6">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="Search your agent folder…"
            value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className="border rounded px-4 py-2" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <div className="text-red-600 mb-4">{error}</div>}

      <ul className="space-y-3">
        {files.map((f) => (
          <li key={f.id} className="border rounded p-3">
            <div className="flex items-start gap-3">
              {f.iconLink && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.iconLink} alt="" className="w-5 h-5 mt-1" />
              )}
              <div>
                <a href={f.webViewLink} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                  {f.name}
                </a>
                {f.modifiedTime && (
                  <div className="text-sm text-gray-600">
                    Updated {new Date(f.modifiedTime).toLocaleDateString()}
                  </div>
                )}
                <div className="text-xs text-gray-500">{f.mimeType}</div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {!loading && files.length === 0 && !error && (
        <div className="text-gray-600">No results yet — try a search.</div>
      )}
    </main>
  );
}
