import "server-only";

import { timingSafeEqual } from "node:crypto";

export function hasValidCronAuthorization(
  authorization: string | null,
  secret: string,
) {
  const prefix = "Bearer ";
  if (!authorization?.startsWith(prefix)) return false;

  const supplied = Buffer.from(authorization.slice(prefix.length), "utf8");
  const expected = Buffer.from(secret, "utf8");
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}
