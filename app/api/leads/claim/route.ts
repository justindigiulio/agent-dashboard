import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { claimLead } from '@/lib/mockLeads';


export async function POST(req: Request){
// TEMP: treat Bearer token as userId
const auth = headers().get('authorization') || '';
const userId = auth.replace(/^Bearer\s+/i, '') || 'agent_123';
const { leadId } = await req.json();


const result = claimLead(userId, leadId);
if (!('ok' in result) || !result.ok){
if (result.reason === 'already_claimed') return new NextResponse('already claimed', { status: 409 });
return new NextResponse('not found', { status: 404 });
}
return NextResponse.json({ ok: true, lead: result.lead });
}
