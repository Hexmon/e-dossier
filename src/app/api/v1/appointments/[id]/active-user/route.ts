import { NextRequest, NextResponse } from 'next/server';
import { getActiveAppointmentWithHolder } from '@/app/db/queries/appointments';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const apt = await getActiveAppointmentWithHolder(id);
  if (!apt) return NextResponse.json({ error: 'not_found', message: 'Active appointment holder not found.' }, { status: 404 });
  return NextResponse.json({
    message: 'Active appointment holder retrieved successfully.',
    user_id: apt.userId,
    username: apt.username,
  }, { status: 200 });
}
