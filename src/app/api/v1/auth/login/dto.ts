// src/app/api/v1/login/dto.ts
import { z } from "zod";

export const LoginBody = z.object({
  appointmentId: z.string().uuid(),
  platoonId: z.string().uuid().optional(),
  username: z.string().min(1),
  password: z.string().min(8),
});
export type LoginBody = z.infer<typeof LoginBody>;