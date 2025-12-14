import { NextRequest, NextResponse } from 'next/server';
import { getActiveAppointmentWithHolder } from '@/app/db/queries/appointments';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const apt = await getActiveAppointmentWithHolder(id);
  if (!apt) {
    await createAuditLog({
      actorUserId: null,
      eventType: AuditEventType.API_REQUEST,
      resourceType: AuditResourceType.APPOINTMENT,
      resourceId: id,
      description: 'Appointment holder lookup failed',
      metadata: { appointmentId: id, found: false },
      request: req,
    });
    return NextResponse.json({ error: 'not_found', message: 'Active appointment holder not found.' }, { status: 404 });
  }
  await createAuditLog({
    actorUserId: null,
    eventType: AuditEventType.API_REQUEST,
    resourceType: AuditResourceType.APPOINTMENT,
    resourceId: id,
    description: 'Appointment holder lookup succeeded',
    metadata: { appointmentId: id, userId: apt.userId },
    request: req,
  });
  return NextResponse.json({
    message: 'Active appointment holder retrieved successfully.',
    user_id: apt.userId,
    username: apt.username,
  }, { status: 200 });
}
export const GET = withRouteLogging('GET', GETHandler);
