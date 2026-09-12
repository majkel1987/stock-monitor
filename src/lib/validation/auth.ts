import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email()),
  password: z.string().min(1).max(4096),
});

export const passwordResetRequestSchema = loginSchema.pick({ email: true });

export const passwordUpdateSchema = z
  .object({
    password: z.string().min(12).max(4096),
    passwordConfirmation: z.string().min(1).max(4096),
  })
  .refine(
    ({ password, passwordConfirmation }) => password === passwordConfirmation,
    {
      message: "Passwords must match.",
      path: ["passwordConfirmation"],
    },
  );

export function isAllowedEmail(
  email: string | undefined,
  allowedEmail: string,
) {
  return email?.trim().toLowerCase() === allowedEmail.trim().toLowerCase();
}
