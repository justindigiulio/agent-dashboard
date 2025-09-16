import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { addLead, type Lead } from '@/lib/mockLeads';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
  // (Optional) read user if you want to track who created it
  const hdrs = await headers();
  const auth = hdrs.get('authorization') ?? '';
  const userId = auth.replace(/^Bearer\s+/i, '') || 'agent_123';

  const body = await req.json();

  // Basic validation: require at least a city or neighborhood
  const hasLocation = (body.city && body.city.trim()) || (body.neighborhood && body.neighborhood.trim());
  if (!hasLocation) {
    return new NextResponse('city or neighborhood is required', { status: 400 });
  }

  const lead: Lead = {
    id: randomUUID(),
    status: 'unclaimed',
    firstName: body.firstName?.trim() || 'Prospect',
    lastName: body.lastName?.trim(),
    email: body.email?.trim(),
    phone: body.phone?.trim(),
    city: body.city?.trim(),
    neighborhood: body.neighborhood?.trim(),
    priceMin: body.priceMin != null ? Number(body.priceMin) : undefined,
    priceMax: body.priceMax != null ? Number(body.priceMax) : undefined,
    leadType: body.leadType || 'rent',
    bedrooms: body.bedrooms != null ? Number(body.bedrooms) : null,
    bathrooms: body.bathrooms != null ? Number(body.bathrooms) : null,
    notes: body.notes,
    source: body.source?.trim() || 'Manual',
    createdAt: new Date().toISOString(),
    claimedAt: null,
    claimedByUserId: null,
  };

  addLead(lead);
  return NextResponse.json({ ok: true, lead }, { status: 201 });
}
