import { z } from "zod";

export const delegationCreateSchema = z
  .object({
    grantorAppointmentId: z.string().uuid(),
    granteeUserId: z.string().uuid(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date().nullable().optional(),
    reason: z.string().trim().min(1).max(500),
  })
  .refine((value) => !value.endsAt || value.startsAt < value.endsAt, {
    message: "startsAt must be earlier than endsAt.",
    path: ["endsAt"],
  });

export const delegationTerminateSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});
