export type LeadStatus = 'unclaimed'|'claimed'|'working'|'won'|'lost'|'dead';
export type Lead = {
id: string;
status: LeadStatus;
firstName?: string; lastName?: string;
email?: string; phone?: string;
city?: string; neighborhood?: string;
priceMin?: number; priceMax?: number;
leadType?: 'rent'|'sale'|'commercial';
bedrooms?: number|null; bathrooms?: number|null;
notes?: string; source?: string;
createdAt: string; claimedAt?: string|null;
claimedByUserId?: string|null;
};


let leads: Lead[] = [
{
id: 'l1', status: 'unclaimed', firstName: 'Prospect',
neighborhood: 'Upper East Side', city: 'Manhattan',
priceMin: 2500, priceMax: 3500, leadType: 'rent',
notes: 'Wants near the Q train. No walk-up.', source: 'Manual',
createdAt: new Date(Date.now() - 30*60*1000).toISOString(),
},
{
id: 'l2', status: 'unclaimed', firstName: 'Prospect',
neighborhood: 'Greenpoint', city: 'Brooklyn',
priceMin: 4000, priceMax: 5200, leadType: 'rent',
notes: '2BR, washer/dryer, pets ok.', source: 'Meta',
createdAt: new Date(Date.now() - 90*60*1000).toISOString(),
},
];


export function mask(l: Lead): Lead {
const { email, phone, notes, ...rest } = l;
return { ...rest };
}
export function getUnclaimed(): Lead[] { return leads.filter(l => l.status === 'unclaimed').map(mask); }
export function getMine(userId: string): Lead[] { return leads.filter(l => l.claimedByUserId === userId); }
export function claimLead(userId: string, leadId: string):
| { ok: true; lead: Lead }
| { ok: false; reason: 'not_found' | 'already_claimed' } {
const i = leads.findIndex(l => l.id === leadId);
if (i < 0) return { ok: false, reason: 'not_found' } as const;
if (leads[i].status !== 'unclaimed') return { ok: false, reason: 'already_claimed' } as const;
leads[i] = {
...leads[i], status: 'claimed', claimedByUserId: userId, claimedAt: new Date().toISOString(),
phone: '(212) 555-0199', email: 'prospect@example.com',
};
return { ok: true, lead: leads[i] } as const;
}
