import { NextResponse } from 'next/server';
import { getUnclaimed } from '@/lib/mockLeads';


export async function GET(){
return NextResponse.json({ leads: getUnclaimed() });
}
