// components/AuthBadge.tsx
"use client";

import { useEffect, useState } from "react";

type SessionResp =
  | { user?: { email?: string | null; name?: string | null; image?: string | null } }
  | null;

export default function AuthBadge() {
  const [session, setSession] = useState<SessionResp>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // NextAuth exposes this JSON in production too
        const r = await fetch("/api/auth/session", { cache: "no-store" });
        const json = r.ok ? await r.json() : null;
        if (alive) setSession(json);
      } catch {
        if (alive) setSession(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <span className="text-xs text-gray-500">…</span>;

  if (!session?.user?.email) {
    return (
      <a
        href="/api/auth/signin?callbackUrl=/profile"
        className="rounded-lg px-3 py-1.5 text-sm"
        style={{ color: "#0B2A1E", border: "1px solid #E5E7EB" }}
      >
        Sign in
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <a href="/profile" className="text-sm" style={{ color: "#0B2A1E" }}>
        {session.user.name || session.user.email}
      </a>
      <a
        href="/api/auth/signout?callbackUrl=/"
        className="text-xs text-gray-500 hover:underline"
      >
        Sign out
      </a>
    </div>
  );
}
