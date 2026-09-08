create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

alter table public.sync_runs
  add constraint sync_runs_error_summary_length_check
  check (error_summary is null or char_length(error_summary) <= 500);

create index sync_runs_job_started_idx
  on public.sync_runs (job_type, started_at desc);

create unique index sync_runs_one_active_orchestrator_idx
  on public.sync_runs ((1))
  where status = 'running'
    and job_type in ('scheduled_market_sync', 'manual_market_sync');

create or replace function public.claim_market_sync(
  p_job_type text,
  p_user_id uuid,
  p_owner_email text,
  p_stale_after_seconds integer,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  run_id uuid,
  user_id uuid,
  acquired boolean,
  reason text
)
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_user_id uuid;
  v_run_id uuid;
  v_active_run_id uuid;
begin
  if p_job_type not in ('scheduled_market_sync', 'manual_market_sync')
    or p_stale_after_seconds not between 60 and 600
    or jsonb_typeof(p_metadata) <> 'object'
  then
    raise exception using errcode = '22023', message = 'invalid sync lease input';
  end if;

  if not pg_try_advisory_xact_lock(723014301) then
    insert into public.sync_runs (
      job_type, provider, finished_at, status, metadata
    ) values (
      p_job_type, 'EODHD/NBP', now(), 'skipped',
      p_metadata || jsonb_build_object('reason', 'advisory_lock_busy')
    ) returning id into v_run_id;
    return query select v_run_id, null::uuid, false, 'skipped_locked'::text;
    return;
  end if;

  update public.sync_runs
  set status = 'failed',
      finished_at = now(),
      requested_count = greatest(requested_count, 1),
      failure_count = greatest(failure_count, 1),
      error_summary = 'Synchronization process ended without completing.',
      metadata = metadata || jsonb_build_object('abandoned', true)
  where status = 'running'
    and job_type in ('scheduled_market_sync', 'manual_market_sync')
    and started_at < now() - make_interval(secs => p_stale_after_seconds);

  select id into v_active_run_id
  from public.sync_runs
  where status = 'running'
    and job_type in ('scheduled_market_sync', 'manual_market_sync')
  order by started_at
  limit 1;

  if v_active_run_id is not null then
    insert into public.sync_runs (
      job_type, provider, finished_at, status, metadata
    ) values (
      p_job_type, 'EODHD/NBP', now(), 'skipped',
      p_metadata || jsonb_build_object(
        'reason', 'active_sync',
        'activeRunId', v_active_run_id
      )
    ) returning id into v_run_id;
    return query select v_run_id, null::uuid, false, 'skipped_locked'::text;
    return;
  end if;

  if p_job_type = 'scheduled_market_sync' then
    select id into v_user_id
    from auth.users
    where lower(email) = lower(btrim(p_owner_email))
    order by created_at
    limit 1;
  else
    select id into v_user_id
    from auth.users
    where id = p_user_id;
  end if;

  if v_user_id is null then
    insert into public.sync_runs (
      job_type, provider, finished_at, status, requested_count,
      failure_count, error_summary, metadata
    ) values (
      p_job_type, 'EODHD/NBP', now(), 'failed', 1, 1,
      'The configured synchronization owner was not found.',
      p_metadata || jsonb_build_object('reason', 'owner_not_found')
    ) returning id into v_run_id;
    return query select v_run_id, null::uuid, false, 'owner_not_found'::text;
    return;
  end if;

  insert into public.sync_runs (job_type, provider, metadata)
  values (
    p_job_type,
    'EODHD/NBP',
    p_metadata || jsonb_build_object('userId', v_user_id)
  )
  returning id into v_run_id;

  return query select v_run_id, v_user_id, true, null::text;
end;
$$;

create or replace function public.enqueue_market_sync()
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault, net, pg_temp
as $$
declare
  v_app_url text;
  v_cron_secret text;
begin
  select decrypted_secret into v_app_url
  from vault.decrypted_secrets
  where name = 'stock_monitor_app_url'
  order by created_at desc
  limit 1;

  select decrypted_secret into v_cron_secret
  from vault.decrypted_secrets
  where name = 'stock_monitor_cron_secret'
  order by created_at desc
  limit 1;

  v_app_url := rtrim(coalesce(v_app_url, ''), '/');
  if v_app_url !~ '^https://[^/@[:space:]?#]+/?$' then
    raise exception using errcode = '22023', message = 'production APP_URL must be a canonical HTTPS origin';
  end if;
  if char_length(coalesce(v_cron_secret, '')) < 32 then
    raise exception using errcode = '22023', message = 'cron secret is missing or too short';
  end if;

  return net.http_post(
    url := v_app_url || '/api/internal/market-sync',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_cron_secret
    ),
    timeout_milliseconds := 270000
  );
end;
$$;

create or replace function public.configure_market_sync_cron()
returns bigint
language plpgsql
security definer
set search_path = public, cron, vault, pg_temp
as $$
declare
  v_job_id bigint;
  v_existing_job_id bigint;
begin
  if not exists (
    select 1 from vault.decrypted_secrets
    where name = 'stock_monitor_app_url'
      and decrypted_secret ~ '^https://[^/@[:space:]?#]+/?$'
  ) or not exists (
    select 1 from vault.decrypted_secrets
    where name = 'stock_monitor_cron_secret'
      and char_length(decrypted_secret) >= 32
  ) then
    raise exception using errcode = '22023', message = 'scheduler Vault configuration is incomplete';
  end if;

  select jobid into v_existing_job_id
  from cron.job
  where jobname = 'stock-monitor-market-sync'
  limit 1;
  if v_existing_job_id is not null then
    perform cron.unschedule(v_existing_job_id);
  end if;

  select cron.schedule(
    'stock-monitor-market-sync',
    '*/30 6-23 * * 1-5',
    'select public.enqueue_market_sync();'
  ) into v_job_id;
  return v_job_id;
end;
$$;

create or replace function public.disable_market_sync_cron()
returns boolean
language plpgsql
security definer
set search_path = cron, pg_temp
as $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname = 'stock-monitor-market-sync'
  limit 1;
  if v_job_id is null then return false; end if;
  return cron.unschedule(v_job_id);
end;
$$;

revoke all on function public.claim_market_sync(
  text, uuid, text, integer, jsonb
) from public, anon, authenticated;
grant execute on function public.claim_market_sync(
  text, uuid, text, integer, jsonb
) to service_role;

revoke all on function public.enqueue_market_sync()
  from public, anon, authenticated, service_role;
revoke all on function public.configure_market_sync_cron()
  from public, anon, authenticated, service_role;
revoke all on function public.disable_market_sync_cron()
  from public, anon, authenticated, service_role;
