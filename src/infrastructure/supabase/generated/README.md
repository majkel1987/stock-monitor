# Generated database types

Run `pnpm db:types` for local Supabase, or `pnpm db:types --linked` for the linked hosted project,
after applying the SQL migrations. The command
writes the actual CLI output to `database.types.ts` only when generation succeeds; a failed CLI
run never replaces an existing types file with an empty file.

Do not hand-maintain a parallel schema here. The initial types were generated from the migrated
`stock-monitor-dev` hosted database on 2026-09-03, with only the public schema selected.
