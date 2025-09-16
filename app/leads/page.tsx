"use client";

import React, { useEffect, useState } from "react";

/** Types */
export type LeadStatus = "unclaimed" | "claimed" | "working" | "won" | "lost" | "dead";
export type Lead = {
  id: string;
  status: LeadStatus;
  firstName?: string;
  lastName?: string;
  email?: string; // shown only for claimed
  phone?: string; // shown only for claimed
  city?: string;
  neighborhood?: string;
  priceMin?: number;
  priceMax?: number;
  leadType?: "rent" | "sale" | "commercial";
  bedrooms?: number | null;
  bathrooms?: number | null;
  notes?: string;
  source?: string;
  createdAt: string; // ISO
  claimedAt?: string | null;
  claimedByUserId?: string | null;
};

/** TEMP auth: token == userId for the mock API */
function useAuth() {
  return {
    isAuthenticated: true,
    user: { id: "agent_123", name: "Test Agent", email: "agent@test.com" },
    token: "agent_123",
  } as const;
}

/** API helpers */
const API = {
  async fetchUnclaimed(token: string, params: URLSearchParams) {
    const res = await fetch("/api/leads/unclaimed?" + params.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to load unclaimed leads");
    return (await res.json()) as { leads: Lead[] };
  },
  async fetchMine(token: string, params: URLSearchParams) {
    const res = await fetch("/api/leads/mine?" + params.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to load my leads");
    return (await res.json()) as { leads: Lead[] };
  },
  async claimLead(token: string, leadId: string) {
    const res = await fetch("/api/leads/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ leadId }),
    });
    if (res.status === 409) return { ok: false, reason: "already_claimed" as const };
    if (!res.ok) throw new Error("Claim failed");
    const data = (await res.json()) as { ok: true; lead: Lead };
    return { ok: true as const, lead: data.lead };
  },
};

/** Utils */
const fmtMoney = (n?: number) =>
  typeof n === "number"
    ? n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "—";

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
};

/** Minimal Inputs (no shadcn/ui) */
function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none " +
        "focus:ring-2 focus:ring-emerald-500 " +
        (props.className || "")
      }
    />
  );
}
function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={
        "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none " +
        "focus:ring-2 focus:ring-emerald-500 " +
        (props.className || "")
      }
    />
  );
}
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  "data-variant"?: "outline" | "solid";
};

function Button(props: ButtonProps) {
  const variant =
    (props["data-variant"] ?? "solid") === "outline"
      ? "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
      : "bg-emerald-600 text-white hover:bg-emerald-700";
  return (
    <button
      {...props}
      className={
        "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition " +
        variant +
        " " +
        (props.className || "")
      }
    />
  );
}


/** Filters */
function Filters({
  value,
  onChange,
}: {
  value: URLSearchParams;
  onChange: (p: URLSearchParams) => void;
}) {
  const [q, setQ] = useState(value.get("q") ?? "");
  const [type, setType] = useState(value.get("type") ?? "all");
  const [borough, setBorough] = useState(value.get("borough") ?? "all");

  useEffect(() => {
    const p = new URLSearchParams(value);
    p.set("q", q);
    p.set("type", type);
    p.set("borough", borough);
    onChange(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, type, borough]);

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="w-full md:max-w-sm">
        <TextInput
          placeholder="Search neighborhood, notes, price…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <SelectInput value={type} onChange={(e) => setType(e.target.value)} className="w-40">
          <option value="all">All Types</option>
          <option value="rent">Rent</option>
          <option value="sale">Sale</option>
          <option value="commercial">Commercial</option>
        </SelectInput>
        <SelectInput value={borough} onChange={(e) => setBorough(e.target.value)} className="w-44">
          <option value="all">All Boroughs</option>
          <option value="Manhattan">Manhattan</option>
          <option value="Brooklyn">Brooklyn</option>
          <option value="Queens">Queens</option>
          <option value="Bronx">Bronx</option>
          <option value="Staten Island">Staten Island</option>
        </SelectInput>
        <Button data-variant="outline" onClick={() => onChange(new URLSearchParams())}>
          Reset
        </Button>
      </div>
    </div>
  );
}

/** Lead Card (no external UI libs) */
function LeadCard({
  lead,
  mode,
  onClaim,
}: {
  lead: Lead;
  mode: "unclaimed" | "mine";
  onClaim?: (id: string) => void;
}) {
  const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Prospect";
  const maskedPhone = lead.phone ?? "(xxx) xxx-xxxx";
  const maskedEmail = lead.email ?? "hidden@masked";

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start justify-between p-4">
        <div>
          <div className="text-lg font-semibold">{name}</div>
          <div className="mt-1 text-xs text-gray-500">Added {timeAgo(lead.createdAt)}</div>
          {lead.leadType && (
            <span className="mt-2 inline-block rounded-md bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-700">
              {lead.leadType}
            </span>
          )}
        </div>
        {mode === "unclaimed" ? (
          <Button onClick={() => onClaim && onClaim(lead.id)} className="rounded-lg">
            Claim
          </Button>
        ) : (
          lead.claimedAt && (
            <div className="text-xs font-medium text-emerald-600">Claimed {timeAgo(lead.claimedAt)}</div>
          )
        )}
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-3">
        <div className="space-y-1 text-sm">
          <div>{lead.neighborhood || lead.city || "—"}</div>
          <div>Budget: {fmtMoney(lead.priceMin)} – {fmtMoney(lead.priceMax)}</div>
          {(lead.bedrooms ?? null) !== null && (
            <div>Beds/Baths: {lead.bedrooms} / {lead.bathrooms ?? "—"}</div>
          )}
        </div>

        <div className="space-y-1 text-sm">
          {mode === "unclaimed" ? (
            <>
              <div className="opacity-60">{maskedPhone}</div>
              <div className="opacity-60">{maskedEmail}</div>
            </>
          ) : (
            <>
              <div>{lead.phone || "—"}</div>
              <div>{lead.email || "—"}</div>
            </>
          )}
          <div className="text-xs text-gray-500">Source: {lead.source || "—"}</div>
        </div>

        <div className="text-sm">
          <div className="overflow-hidden text-ellipsis">
            {mode === "unclaimed" ? (lead.notes ? `${lead.notes.slice(0, 120)}…` : "—") : (lead.notes || "—")}
          </div>
          {mode === "unclaimed" && (
            <div className="mt-2 text-xs text-amber-600">Contact info hidden until claimed</div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Main page */
export default function LeadClaimBoard() {
  const { isAuthenticated, token } = useAuth();

  const [tab, setTab] = useState<"unclaimed" | "mine">("unclaimed");
  const [params, setParams] = useState<URLSearchParams>(new URLSearchParams());
  const [loading, setLoading] = useState(false);
  const [unclaimed, setUnclaimed] = useState<Lead[]>([]);
  const [mine, setMine] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = async (which: "unclaimed" | "mine" | "both" = "both") => {
    try {
      setError(null);
      setLoading(true);
      if (which === "both" || which === "unclaimed") {
        const { leads } = await API.fetchUnclaimed(token, params);
        setUnclaimed(leads);
      }
      if (which === "both" || which === "mine") {
        const { leads } = await API.fetchMine(token, params);
        setMine(leads);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  // initial load
  useEffect(() => {
    refresh("both");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refresh when filters change (just the active tab)
  useEffect(() => {
    refresh(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // light polling for Unclaimed
  useEffect(() => {
    const id = setInterval(() => refresh("unclaimed"), 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onClaim = async (leadId: string) => {
    try {
      setLoading(true);
      const res = await API.claimLead(token, leadId);
      if (!res.ok) {
        setError("That lead was just claimed by someone else.");
        await refresh("unclaimed");
        return;
      }
      const claimed = res.lead!;
      setUnclaimed((prev) => prev.filter((l) => l.id !== leadId));
      setMine((prev) => [claimed, ...prev]);
      setTab("mine");
    } catch (e: any) {
      setError(e.message || "Could not claim lead");
    } finally {
      setLoading(false);
    }
  };

  const header = (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lead Claim Board</h1>
        <p className="text-sm text-gray-600">
          First-come, first-serve. Contact details are visible only on your claimed leads.
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
        Live feed
      </div>
    </div>
  );

  const emptyState = (
    <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-500">
      No leads found. Try adjusting filters.
    </div>
  );

  const list = (items: Lead[], mode: "unclaimed" | "mine") => (
    <div className="grid gap-3">
      {items.length === 0 ? emptyState : items.map((lead) => (
        <LeadCard key={lead.id} lead={lead} mode={mode} onClaim={onClaim} />
      ))}
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-4">
        {header}
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          Please sign in to view and claim leads.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      {header}

      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="space-y-4 p-6">
          <Filters value={params} onChange={setParams} />

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Simple tabs without external UI libs */}
          <div className="mt-2">
            <div className="mb-3 grid grid-cols-2 gap-2">
              <Button
                onClick={() => setTab("unclaimed")}
                className={tab === "unclaimed" ? "" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}
              >
                Unclaimed
              </Button>
              <Button
                onClick={() => setTab("mine")}
                className={tab === "mine" ? "" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}
              >
                My Leads
              </Button>
            </div>

            {tab === "unclaimed" && (
              <>
                {loading && <div className="text-sm text-gray-500">Loading…</div>}
                {list(unclaimed, "unclaimed")}
              </>
            )}
            {tab === "mine" && (
              <>
                {loading && <div className="text-sm text-gray-500">Loading…</div>}
                {list(mine, "mine")}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Tip: hook Slack/SMS notifications so new unclaimed leads post with a “Claim” link back here.
      </div>
    </div>
  );
}
