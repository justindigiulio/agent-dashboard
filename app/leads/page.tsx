"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Loader2,
  MapPin,
  Phone,
  Mail,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Search,
} from "lucide-react";

/** Types */
export type LeadStatus =
  | "unclaimed"
  | "claimed"
  | "working"
  | "won"
  | "lost"
  | "dead";

export type Lead = {
  id: string;
  status: LeadStatus;
  firstName?: string;
  lastName?: string;
  email?: string; // masked/omitted for unclaimed
  phone?: string; // masked/omitted for unclaimed
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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ leadId }),
    });
    if (res.status === 409) {
      return { ok: false, reason: "already_claimed" as const };
    }
    if (!res.ok) throw new Error("Claim failed");
    const data = (await res.json()) as { ok: true; lead: Lead };
    return { ok: true as const, lead: data.lead };
  },
};

/** Utils */
const fmtMoney = (n?: number) =>
  typeof n === "number"
    ? n.toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      })
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
      <div className="relative w-full md:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
        <Input
          className="pl-9"
          placeholder="Search neighborhood, notes, price…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="rent">Rent</SelectItem>
            <SelectItem value="sale">Sale</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
          </SelectContent>
        </Select>
        <Select value={borough} onValueChange={setBorough}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Borough" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Boroughs</SelectItem>
            <SelectItem value="Manhattan">Manhattan</SelectItem>
            <SelectItem value="Brooklyn">Brooklyn</SelectItem>
            <SelectItem value="Queens">Queens</SelectItem>
            <SelectItem value="Bronx">Bronx</SelectItem>
            <SelectItem value="Staten Island">Staten Island</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => onChange(new URLSearchParams())}
        >
          <Filter className="h-4 w-4" /> Reset
        </Button>
      </div>
    </div>
  );
}

/** Lead Card */
function LeadCard({
  lead,
  mode,
  onClaim,
}: {
  lead: Lead;
  mode: "unclaimed" | "mine";
  onClaim?: (id: string) => void;
}) {
  const maskedPhone = lead.phone ?? "(xxx) xxx-xxxx";
  const maskedEmail = lead.email ?? "hidden@masked";
  const name =
    [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Prospect";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="rounded-2xl shadow-sm border-muted">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              {name}
              {lead.leadType && (
                <Badge variant="secondary" className="ml-2 capitalize">
                  {lead.leadType}
                </Badge>
              )}
            </CardTitle>
            <div className="mt-1 text-xs text-muted-foreground">
              Added {timeAgo(lead.createdAt)}
            </div>
          </div>

          {mode === "unclaimed" ? (
            <Button
              size="sm"
              onClick={() => onClaim && onClaim(lead.id)}
              className="rounded-xl"
            >
              Claim
            </Button>
          ) : (
            lead.claimedAt && (
              <div className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> Claimed{" "}
                {timeAgo(lead.claimedAt)}
              </div>
            )
          )}
        </CardHeader>

        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 opacity-70" />
              {lead.neighborhood || lead.city || "—"}
            </div>
            <div className="text-sm">
              Budget: {fmtMoney(lead.priceMin)} – {fmtMoney(lead.priceMax)}
            </div>
            {(lead.bedrooms ?? null) !== null && (
              <div className="text-sm">
                Beds/Baths: {lead.bedrooms} / {lead.bathrooms ?? "—"}
              </div>
            )}
          </div>

          <div className="space-y-1">
            {mode === "unclaimed" ? (
              <>
                <div className="flex items-center gap-2 text-sm opacity-60">
                  <Phone className="h-4 w-4" />
                  {maskedPhone}
                </div>
                <div className="flex items-center gap-2 text-sm opacity-60">
                  <Mail className="h-4 w-4" />
                  {maskedEmail}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4" />
                  {lead.phone || "—"}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4" />
                  {lead.email || "—"}
                </div>
              </>
            )}
            <div className="text-xs text-muted-foreground">
              Source: {lead.source || "—"}
            </div>
          </div>

          <div className="md:col-span-1">
            <div className="text-sm line-clamp-3">
              {mode === "unclaimed"
                ? lead.notes
                  ? `${lead.notes.slice(0, 120)}…`
                  : "—"
                : lead.notes || "—"}
            </div>
            {mode === "unclaimed" && (
              <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" /> Contact info hidden
                until claimed
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** Main page */
export default function LeadClaimBoard() {
  const { isAuthenticated, token } = useAuth();

  const [tab, setTab] = useState<"unclaimed" | "mine">("unclaimed");
  const [params, setParams] = useState<URLSearchParams>(
    new URLSearchParams()
  );
  const [loading, setLoading] = useState(false);
  const [unclaimed, setUnclaimed] = useState<Lead[]>([]);
  const [mine, setMine] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = async (
    which: "unclaimed" | "mine" | "both" = "both"
  ) => {
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

  // refresh when filters change
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
      const claimed = res.lead;
      setUnclaimed((prev) => prev.filter((l) => l.id !== leadId));
      setMine((prev) => [claimed, ...prev]);
      setTab("mine");
    } catch (e: any) {
      setError(e.message || "Could not claim lead");
    } finally {
      setLoading(false);
    }
  };

  const emptyState = (
    <Card className="rounded-2xl">
      <CardContent className="py-10 text-center text-muted-foreground">
        No leads found. Try adjusting filters.
      </CardContent>
    </Card>
  );

  const header = (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Lead Claim Board
        </h1>
        <p className="text-sm text-muted-foreground">
          First-come, first-serve. Contact details are visible only on your
          claimed leads.
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        Live feed
      </div>
    </div>
  );

  const list = (items: Lead[], mode: "unclaimed" | "mine") => (
    <div className="grid gap-3">
      {items.length === 0
        ? emptyState
        : items.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              mode={mode}
              onClaim={onClaim}
            />
          ))}
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-5xl p-4">
        {header}
        <Card className="mt-4 rounded-2xl">
          <CardContent className="py-10 text-center">
            Please sign in to view and claim leads.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-4">
      {header}

      <Card className="rounded-2xl">
        <CardContent className="pt-6 space-y-4">
          <Filters value={params} onChange={setParams} />

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 border border-red-100">
              {error}
            </div>
          )}

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2 rounded-xl">
              <TabsTrigger value="unclaimed" className="rounded-xl">
                Unclaimed
              </TabsTrigger>
              <TabsTrigger value="mine" className="rounded-xl">
                My Leads
              </TabsTrigger>
            </TabsList>

            <TabsContent value="unclaimed" className="space-y-3">
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              )}
              {list(unclaimed, "unclaimed")}
            </TabsContent>

            <TabsContent value="mine" className="space-y-3">
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              )}
              {list(mine, "mine")}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        Tip: hook Slack/SMS notifications so new unclaimed leads post with a
        “Claim” link back here.
      </div>
    </div>
  );
}
