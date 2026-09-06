import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const target = process.argv.includes("--linked") ? "--linked" : "--local";

const result = spawnSync(
  `pnpm dlx supabase@2.116.0 gen types typescript ${target} --schema public`,
  {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    encoding: "utf8",
    shell: true,
  },
);

if (result.stderr) process.stderr.write(result.stderr);

if (result.error || result.status !== 0) {
  if (result.stdout) process.stderr.write(result.stdout);
  if (result.error) console.error(result.error.message);
  process.exit(result.status ?? 1);
}

if (!result.stdout.includes("export type Database")) {
  console.error(
    "Supabase CLI did not return database types; the existing file was not changed.",
  );
  process.exit(1);
}

writeFileSync(
  new URL(
    "../src/infrastructure/supabase/generated/database.types.ts",
    import.meta.url,
  ),
  result.stdout,
  "utf8",
);
