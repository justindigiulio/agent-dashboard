"use client";

import React, { useEffect, useState } from "react";

type AgentProfile = {
  userId: string;
  bio: string;
  headshotDataUrl?: string | null;
  updatedAt: string;
};

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={
        "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none " +
        "focus:ring-2 focus:ring-emerald-500 " +
        (props.className || "")
      }
    />
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "outline";
};
function Button({ variant = "solid", className = "", ...rest }: ButtonProps) {
  const style =
    variant === "outline"
      ? "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
      : "bg-emerald-600 text-white hover:bg-emerald-700";
  return (
    <button
      {...rest}
      className={
        "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition " +
        style +
        " " +
        className
      }
    />
  );
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bio, setBio] = useState("");
  const [headshotPreview, setHeadshotPreview] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/profile/me", { cache: "no-store" });
      if (!r.ok) throw new Error(await r.text());
      const data = (await r.json()) as { profile: AgentProfile };
      setBio(data.profile.bio || "");
      setHeadshotPreview(data.profile.headshotDataUrl || null);
      setLastUpdated(data.profile.updatedAt || null);
    } catch (e: any) {
      setError(e.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFileToUpload(f);
    if (f) {
      const rd = new FileReader();
      rd.onload = () => setHeadshotPreview(rd.result as string);
      rd.readAsDataURL(f);
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("bio", bio);
      if (fileToUpload) form.set("headshot", fileToUpload);
      const r = await fetch("/api/profile/update", { method: "POST", body: form });
      if (!r.ok) throw new Error(await r.text());
      const data = (await r.json()) as { ok: true; profile: AgentProfile };
      setHeadshotPreview(data.profile.headshotDataUrl || null);
      setLastUpdated(data.profile.updatedAt || null);
    } catch (e: any) {
      setError(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agent Profile</h1>
          <p className="text-sm text-gray-600">Headshot, bio, and (soon) your earnings.</p>
        </div>
        <a
          href="/leads"
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          ← Back to Lead Board
        </a>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border bg-white p-10 text-center text-gray-500">Loading…</div>
      ) : (
        <form onSubmit={onSave} className="grid gap-6">
          {/* Headshot */}
          <div className="rounded-2xl border bg-white p-6">
            <h2 className="mb-3 text-lg font-semibold">Headshot</h2>
            <div className="flex items-center gap-4">
              <div className="h-24 w-24 overflow-hidden rounded-full border bg-gray-100">
                {headshotPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={headshotPreview} alt="Headshot" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                    No photo
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <input type="file" accept="image/*" onChange={onPickFile} />
                <div className="text-xs text-gray-500">Max 2MB. JPG/PNG.</div>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="rounded-2xl border bg-white p-6">
            <h2 className="mb-3 text-lg font-semibold">Bio</h2>
            <TextArea
              rows={5}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Experience, specialties, languages, neighborhoods…"
            />
          </div>

          {/* Earnings / Deals placeholder */}
          <div className="rounded-2xl border bg-white p-6">
            <h2 className="mb-3 text-lg font-semibold">Gross Commissions & Closed Deals</h2>
            <div className="rounded-lg border border-dashed p-6 text-sm text-gray-500">
              Under construction — this will show your YTD gross commissions and a list of closed deals.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => location.reload()}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Profile"}
            </Button>
          </div>

          {lastUpdated && (
            <div className="text-right text-xs text-gray-500">
              Last updated {new Date(lastUpdated).toLocaleString()}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
