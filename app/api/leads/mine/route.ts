import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getMine } from '@/lib/mockLeads';


export async function GET(){
// TEMP: treat Bearer token as userId so each agent only sees their leads
const auth = headers().get('authorization') || '';
const userId = auth.replace(/^Bearer\s+/i, '') || 'agent_123';
return NextResponse.json({ leads: getMine(userId) });
}
