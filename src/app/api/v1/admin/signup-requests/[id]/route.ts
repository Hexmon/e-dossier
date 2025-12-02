import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/authz';
import { deleteSignupRequest } from '@/app/db/queries/signupRequests';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId: adminUserId } = await requireAdmin(req);
    const { id } = await params;
    await deleteSignupRequest({ requestId: id, adminUserId });
    return json.ok({ message: 'Signup request deleted successfully.' });
  } catch (err: any) {
    if (err?.message === 'request_not_found') return json.notFound('Request not found.');
    if (err?.message === 'cannot_delete_pending') return json.badRequest('Cannot delete a pending request.');
    return handleApiError(err);
  }
}
