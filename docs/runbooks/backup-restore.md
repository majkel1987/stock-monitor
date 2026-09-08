# Backup and restore runbook

Use this procedure before Supabase becomes the only copy of investment research. Perform a weekly
logical backup and retain several dated generations outside Supabase. Test a restore to an isolated
database at least quarterly.

## Prerequisites and secure access

- PostgreSQL client tools matching or newer than the hosted server (`pg_dump`, `pg_restore`, `psql`).
- A restricted database connection obtained from the Supabase dashboard at execution time.
- An encrypted local destination and a second encrypted off-site destination.

Do not put a database password, connection string, service-role key, production dump, or personal
research data in Git, shell scripts, tickets, or logs. Supply credentials through an interactive
prompt or a short-lived secret manager session.

## Backup

1. Create a dated directory on an encrypted volume outside this repository.
2. Run a custom-format logical dump with `pg_dump --format=custom --no-owner --no-acl --file <dated-file> <connection>`.
3. Record the UTC timestamp, project reference, PostgreSQL version, migration commit, dump size, and
   SHA-256 checksum in a separate operator log without credentials.
4. Encrypt the dump with the organization's approved encryption tool before copying it off-site.
5. Retain multiple weekly generations; never overwrite the newest known-good backup.
6. Verify the encrypted off-site copy can be read and its checksum matches.

Vault values and Vercel environment variables are operational secrets, not repository backup data.
Back them up separately in an approved password manager.

## Restore rehearsal

1. Provision an empty, isolated test project. Never rehearse against production.
2. Apply the repository migrations from zero to confirm schema reproducibility.
3. Decrypt a selected dump only onto an encrypted temporary volume.
4. Restore with `pg_restore --no-owner --no-acl --clean --if-exists --dbname <test-connection> <dump>`.
5. Verify table counts, the allowed user's watchlist, monitoring/thesis history, notes, latest quotes,
   FX rates, RLS/grants, and application login against the test database.
6. Run pgTAP and the critical Playwright journey where appropriate.
7. Destroy the test project and securely remove the decrypted temporary copy under the local
   platform's approved procedure.
8. Record the rehearsal result and remediation. Do not state that restore is tested until this
   procedure has actually completed successfully.
