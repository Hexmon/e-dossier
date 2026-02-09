import { NextResponse } from 'next/server';
import { getActiveAppointmentWithHolder } from '@/app/db/queries/appointments';
import {
  withAuditRoute,
  AuditEventType,
  AuditResourceType,
} from '@/lib/audit';
import type { AuditNextRequest } from '@/lib/audit';

async function GETHandler(req: AuditNextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const apt = await getActiveAppointmentWithHolder(id);
  if (!apt) {
    await req.audit.log({
      action: AuditEventType.API_REQUEST,
      outcome: 'FAILURE',
      actor: { type: 'anonymous', id: 'unknown' },
      target: { type: AuditResourceType.APPOINTMENT, id },
      metadata: { appointmentId: id, found: false, description: 'Appointment holder lookup failed' },
    });
    return NextResponse.json({ error: 'not_found', message: 'Active appointment holder not found.' }, { status: 404 });
  }
  await req.audit.log({
    action: AuditEventType.API_REQUEST,
    outcome: 'SUCCESS',
    actor: { type: 'anonymous', id: 'unknown' },
    target: { type: AuditResourceType.APPOINTMENT, id },
    metadata: { appointmentId: id, userId: apt.userId, description: 'Appointment holder lookup succeeded' },
  });
  return NextResponse.json({
    message: 'Active appointment holder retrieved successfully.',
    user_id: apt.userId,
    username: apt.username,
  }, { status: 200 });
}
export const GET = withAuditRoute('GET', GETHandler);
