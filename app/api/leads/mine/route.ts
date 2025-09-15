import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getMine } from '@/lib/mockLeads';

export async function GET() {
  // TEMP auth: we treat Bearer token as userId for the mock
  const auth = headers().get('authorization') || '';
  const userId = auth.replace(/^Bearer\s+/i, '') || 'agent_123';
  return NextResponse.json({ leads: getMine(userId) });
}
