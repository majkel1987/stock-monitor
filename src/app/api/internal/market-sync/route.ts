import { getAccess } from "@/infrastructure/supabase/server/auth";

export async function POST() {
  const access = await getAccess();
  if (access.status !== "allowed") {
    return Response.json(
      { error: access.status },
      {
        status: access.status === "forbidden" ? 403 : 401,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
  return Response.json(
    {
      error: "not_implemented",
      message:
        "Market synchronization is not implemented in the project scaffold.",
    },
    {
      status: 501,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
