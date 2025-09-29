// app/profile/page.tsx
"use client";

import { useEffect, useState } from "react";

type Profile = {
  id: string;
  email: string | null;
  name: string | null;
  headshotUrl: string | null;
  bio: string | null;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<"loading" | "signedout" | "ready" | "error">("loading");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Hit your existing API (returns 401 when not authed)
        const r = await fetch("/api/profile/me", { cache: "no-store" });
        if (r.status === 401) {
          if (alive) setStatus("signedout");
          return;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (alive) {
          setProfile(data?.profile ?? null);
          setStatus("ready");
        }
      } catch (e: any) {
        if (alive) {
          setErr(e?.message || "Failed to load profile");
          setStatus("error");
        }
      }
    })();
    return () => { alive = false; };
  }, []);

  if (status === "loading") {
    return <div className="mx-auto max-w-3xl p-6">Loading…</div>;
  }

  if (status === "signedout") {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Your Profile</h1>
        <p className="mt-2 text-gray-700">You’re signed out.</p>
        <a
          href="/api/auth/signin?callbackUrl=/profile"
          className="mt-4 inline-block rounded-lg border px-3 py-2 text-sm"
        >
          Sign in to view profile
        </a>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Your Profile</h1>
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      </div>
    );
  }

  // ready
  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Your Profile</h1>
        <p className="text-sm text-gray-600">
          Headshot & bio are editable. Earnings/closed deals are <b>under construction</b>.
        </p>
      </header>

      <section className="rounded-2xl border p-5">
        <h2 className="font-medium">Basic</h2>
        <div className="mt-3 text-sm text-gray-800">
          <div><span className="text-gray-500">Name:</span> {profile?.name || "—"}</div>
          <div><span className="text-gray-500">Email:</span> {profile?.email || "—"}</div>
        </div>
      </section>

      <section className="rounded-2xl border p-5">
        <h2 className="font-medium">Headshot</h2>
        <div className="mt-3 flex items-center gap-4">
          {profile?.headshotUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.headshotUrl}
              alt="Headshot"
              className="h-20 w-20 rounded-full object-cover border"
            />
          ) : (
            <div className="h-20 w-20 rounded-full border bg-gray-50" />
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const file = (e.currentTarget.elements.namedItem("photo") as HTMLInputElement)
                ?.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.append("photo", file);
              const r = await fetch("/api/profile/update", { method: "POST", body: fd });
              if (r.ok) {
                location.reload();
              } else {
                alert("Upload failed");
              }
            }}
          >
            <input type="file" name="photo" accept="image/*" className="text-sm" />
            <button
              type="submit"
              className="ml-2 rounded-lg border px-3 py-1.5 text-sm"
            >
              Upload
            </button>
          </form>
        </div>
      </section>

      <section className="rounded-2xl border p-5">
        <h2 className="font-medium">Bio</h2>
        <form
          className="mt-3 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const bio = (e.currentTarget.elements.namedItem("bio") as HTMLTextAreaElement)?.value || "";
            const r = await fetch("/api/profile/update", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bio }),
            });
            if (r.ok) location.reload();
            else alert("Failed to save bio");
          }}
        >
          <textarea
            name="bio"
            defaultValue={profile?.bio || ""}
            className="w-full rounded-md border p-2 text-sm"
            rows={5}
            placeholder="Write a short bio…"
          />
          <button type="submit" className="rounded-lg border px-3 py-1.5 text-sm">
            Save
          </button>
        </form>
      </section>

      <section className="rounded-2xl border p-5">
        <h2 className="font-medium">Earnings / Closed deals</h2>
        <div className="mt-2 text-sm text-gray-600">Under construction.</div>
      </section>
    </div>
  );
}
