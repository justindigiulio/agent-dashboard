import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getMine } from '@/lib/mockLeads';

export async function GET() {
  // Next 15: headers() is async
  const hdrs = await headers();
  const auth = hdrs.get('authorization') ?? '';
  const userId = auth.replace(/^Bearer\s+/i, '') || 'agent_123';

  return NextResponse.json({ leads: getMine(userId) });
}
