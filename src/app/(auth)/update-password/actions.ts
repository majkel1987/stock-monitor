"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAccess } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";
import { passwordUpdateSchema } from "@/lib/validation/auth";

export async function updatePassword(formData: FormData) {
  const input = passwordUpdateSchema.safeParse({
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });
  if (!input.success) redirect("/update-password?error=invalid_password");

  const client = await createClient("writable");
  const access = await getAccess(client);
  if (access.status !== "allowed") {
    redirect(
      access.status === "forbidden"
        ? "/login?error=access_denied"
        : "/login?error=recovery_failed",
    );
  }

  const { error } = await client.auth.updateUser({
    password: input.data.password,
  });
  if (error) redirect("/update-password?error=update_failed");

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
