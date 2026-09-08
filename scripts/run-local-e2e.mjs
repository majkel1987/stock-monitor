import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const packageManagerPath = process.env.npm_execpath;
if (!packageManagerPath) {
  throw new Error("The E2E runner must be started through pnpm.");
}

function runPnpm(args, options = {}) {
  return spawnSync(process.execPath, [packageManagerPath, ...args], options);
}

const status = runPnpm(["dlx", "supabase@2.116.0", "status", "-o", "env"], {
  cwd: process.cwd(),
  encoding: "utf8",
});

if (status.status !== 0) {
  process.stderr.write(
    status.stderr ||
      status.error?.message ||
      "Local Supabase is not running.\n",
  );
  process.exit(status.status ?? 1);
}

const values = Object.fromEntries(
  status.stdout
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z_]+)="(.*)"$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2]]),
);

const apiUrl = values.API_URL;
const anonKey = values.ANON_KEY;
const serviceRoleKey = values.SERVICE_ROLE_KEY;
if (!apiUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Supabase status did not return the required local keys.");
}
const apiHostname = new URL(apiUrl).hostname;
if (apiHostname !== "127.0.0.1" && apiHostname !== "localhost") {
  throw new Error("The local E2E runner refuses to use a remote Supabase API.");
}

const email = `e2e-${Date.now()}@example.test`;
const password = `E2e-${randomBytes(12).toString("hex")}!`;
const admin = createClient(apiUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: created, error: createError } = await admin.auth.admin.createUser(
  { email, password, email_confirm: true },
);
if (createError || !created.user) {
  throw new Error(`Could not provision the E2E user: ${createError?.message}`);
}
const { error: statusError } = await admin.rpc("initialize_default_statuses", {
  p_user_id: created.user.id,
});
if (statusError) {
  throw new Error(`Could not initialize E2E statuses: ${statusError.message}`);
}
const verifier = createClient(apiUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { error: verificationError } = await verifier.auth.signInWithPassword({
  email,
  password,
});
if (verificationError) {
  throw new Error(
    `The provisioned E2E credentials were rejected: ${verificationError.message}`,
  );
}
await verifier.auth.signOut();

const result = runPnpm(["exec", "playwright", "test"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: apiUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    ALLOWED_USER_EMAIL: email,
    CRON_SECRET: "local-e2e-cron-secret-at-least-32-characters",
    APP_URL: "http://localhost:3000",
    E2E_USER_EMAIL: email,
    E2E_USER_PASSWORD: password,
    E2E_TICKER: `M7${Date.now().toString(36).slice(-6).toUpperCase()}`,
  },
  stdio: "inherit",
});

process.exit(result.status ?? 1);
