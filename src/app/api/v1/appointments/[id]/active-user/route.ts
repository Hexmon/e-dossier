import { NextRequest, NextResponse } from 'next/server';
import { getActiveAppointmentWithHolder } from '@/app/db/queries/appointments';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const apt = await getActiveAppointmentWithHolder(params.id);
  if (!apt) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({
    user_id: apt.userId,
    username: apt.username,
  });
}
