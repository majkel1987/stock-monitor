"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { loginSchema } from "@/lib/validation/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";
import { getAccess } from "@/infrastructure/supabase/server/auth";
import { signOutLocally } from "@/infrastructure/supabase/server/sign-out";

export async function login(formData: FormData) {
  const input = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!input.success) redirect("/login?error=invalid_credentials");

  const client = await createClient("writable");
  const { error } = await client.auth.signInWithPassword(input.data);
  if (error) redirect("/login?error=invalid_credentials");

  const access = await getAccess(client);
  if (access.status !== "allowed") {
    await signOutLocally(client);
    redirect("/login?error=access_denied");
  }
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  // Logout is also available to expired or forbidden sessions so they can be discarded.
  const client = await createClient("writable");
  await signOutLocally(client);
  revalidatePath("/", "layout");
  redirect("/login");
}
