export async function POST() {
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
