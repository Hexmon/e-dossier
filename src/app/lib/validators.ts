import { z } from 'zod';

// password policy: tune as you like
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  // at least 1 letter and 1 number (adjust as desired)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

export const signupSchema = z.object({
  username: z.string().trim().min(3).max(64),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(255),
  phone: z.string().trim().min(3).max(32),
  usertype: z.string().trim().min(1).max(64),
  rank: z.string().trim().min(1).max(64),
  password: passwordSchema,
  confirmPassword: z.string(),
}).superRefine(({ password, confirmPassword }, ctx) => {
  if (password !== confirmPassword) {
    ctx.addIssue({
      path: ['confirmPassword'],
      code: z.ZodIssueCode.custom,
      message: 'Passwords do not match',
    });
  }
});
