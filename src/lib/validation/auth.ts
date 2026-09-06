import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email()),
  password: z.string().min(1).max(4096),
});

export function isAllowedEmail(
  email: string | undefined,
  allowedEmail: string,
) {
  return email?.trim().toLowerCase() === allowedEmail.trim().toLowerCase();
}
