"use client";
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
<CardContent className="py-10 text-center text-muted-foreground">No leads found. Try adjusting filters.</CardContent>
</Card>
);


const header = (
<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
<div>
<h1 className="text-2xl font-semibold tracking-tight">Lead Claim Board</h1>
<p className="text-sm text-muted-foreground">First-come, first-serve. Contact details are visible only on your claimed leads.</p>
</div>
<div className="flex items-center gap-2 text-xs text-muted-foreground">
<div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live feed
</div>
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
<div className="mx-auto max-w-5xl p-4">
{header}
<Card className="mt-4 rounded-2xl"><CardContent className="py-10 text-center">Please sign in to view and claim leads.</CardContent></Card>
</div>
);
}


return (
<div className="mx-auto max-w-6xl p-4 space-y-4">
{header}
<Card className="rounded-2xl">
<CardContent className="pt-6 space-y-4">
<Filters value={params} onChange={setParams} />
{error && (<div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 border border-red-100">{error}</div>)}
<Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
<TabsList className="grid w-full grid-cols-2 rounded-xl">
<TabsTrigger value="unclaimed" className="rounded-xl">Unclaimed</TabsTrigger>
<TabsTrigger value="mine" className="rounded-xl">My Leads</TabsTrigger>
</TabsList>
<TabsContent value="unclaimed" className="space-y-3">
{loading && (<div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>)}
{list(unclaimed, "unclaimed")}
</TabsContent>
<TabsContent value="mine" className="space-y-3">
{loading && (<div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>)}
{list(mine, "mine")}
</TabsContent>
</Tabs>
</CardContent>
</Card>
<div className="text-xs text-muted-foreground">Tip: hook Slack/SMS notifications so new unclaimed leads post with a “Claim” deep link back here.</div>
</div>
);
}
