// src/app/api/v1/login/dto.ts
import { z } from "zod";

export const LoginBody = z
  .object({
    appointmentId: z.string().uuid().optional(),
    delegationId: z.string().uuid().optional(),
    platoonId: z.string().uuid().optional(),
    username: z.string().min(1),
    password: z.string().min(8),
  })
  .superRefine((value, ctx) => {
    const hasAppointment = Boolean(value.appointmentId);
    const hasDelegation = Boolean(value.delegationId);

    if (hasAppointment === hasDelegation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["appointmentId"],
        message: "Provide exactly one of appointmentId or delegationId.",
      });
    }
  });
export type LoginBody = z.infer<typeof LoginBody>;
