insert into public.markets (code, name, currency, timezone, mic_codes)
values
  ('GPW', 'Warsaw Stock Exchange', 'PLN', 'Europe/Warsaw', array['XWAR']),
  ('USA', 'United States', 'USD', 'America/New_York', array[]::text[])
on conflict (code) do update
set name = excluded.name,
    currency = excluded.currency,
    timezone = excluded.timezone,
    mic_codes = excluded.mic_codes;

-- Default statuses are user-owned and therefore cannot be seeded before an Auth user exists.
-- After manually provisioning the allowed user, run:
-- select public.initialize_default_statuses(id)
-- from auth.users
-- where lower(email) = lower('owner@example.com');
