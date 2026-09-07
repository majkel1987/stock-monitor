create view public.dashboard_monitoring_summary
with (security_invoker = true)
as
with monitoring_history as (
  select
    mr.id,
    mr.user_id,
    mr.stock_id,
    mr.analyzed_at,
    mr.created_at,
    mr.supersedes_id,
    mr.status_definition_id,
    sd.slug as status_slug,
    sd.label as status_label,
    sd.color_token as status_color_token,
    sd.dashboard_group as status_dashboard_group,
    sd.sort_order as status_sort_order,
    mr.investment_score,
    mr.recommendation,
    mr.summary,
    mr.price,
    mr.currency,
    lag(mr.status_definition_id) over stock_history
      as chronological_previous_status_definition_id,
    lag(sd.slug) over stock_history as chronological_previous_status_slug,
    lag(sd.label) over stock_history as chronological_previous_status_label,
    lag(sd.color_token) over stock_history
      as chronological_previous_status_color_token,
    lag(sd.dashboard_group) over stock_history
      as chronological_previous_status_dashboard_group,
    lag(sd.sort_order) over stock_history
      as chronological_previous_status_sort_order,
    lag(mr.investment_score) over stock_history
      as chronological_previous_investment_score,
    exists (
      select 1
      from public.monitoring_results as correction
      where correction.user_id = mr.user_id
        and correction.stock_id = mr.stock_id
        and correction.supersedes_id = mr.id
        and correction.deleted_at is null
    ) as is_superseded
  from public.monitoring_results as mr
  join public.watchlist_items as wi
    on wi.user_id = mr.user_id
   and wi.stock_id = mr.stock_id
   and wi.archived_at is null
  join public.status_definitions as sd
    on sd.id = mr.status_definition_id
   and sd.user_id = mr.user_id
  where mr.deleted_at is null
  window stock_history as (
    partition by mr.user_id, mr.stock_id
    order by mr.analyzed_at, mr.created_at, mr.id
  )
), active_monitoring as (
  select
    history.id,
    history.user_id,
    history.stock_id,
    history.analyzed_at,
    history.created_at,
    history.status_definition_id,
    history.status_slug,
    history.status_label,
    history.status_color_token,
    history.status_dashboard_group,
    history.status_sort_order,
    history.investment_score,
    history.recommendation,
    history.summary,
    history.price,
    history.currency,
    case
      when history.supersedes_id is not null then explicit_previous.status_definition_id
      else history.chronological_previous_status_definition_id
    end as previous_status_definition_id,
    case
      when history.supersedes_id is not null then previous_status.slug
      else history.chronological_previous_status_slug
    end as previous_status_slug,
    case
      when history.supersedes_id is not null then previous_status.label
      else history.chronological_previous_status_label
    end as previous_status_label,
    case
      when history.supersedes_id is not null then previous_status.color_token
      else history.chronological_previous_status_color_token
    end as previous_status_color_token,
    case
      when history.supersedes_id is not null then previous_status.dashboard_group
      else history.chronological_previous_status_dashboard_group
    end as previous_status_dashboard_group,
    case
      when history.supersedes_id is not null then previous_status.sort_order
      else history.chronological_previous_status_sort_order
    end as previous_status_sort_order,
    case
      when history.supersedes_id is not null then explicit_previous.investment_score
      else history.chronological_previous_investment_score
    end as previous_investment_score
  from monitoring_history as history
  left join public.monitoring_results as explicit_previous
    on explicit_previous.id = history.supersedes_id
   and explicit_previous.user_id = history.user_id
   and explicit_previous.stock_id = history.stock_id
  left join public.status_definitions as previous_status
    on previous_status.id = explicit_previous.status_definition_id
   and previous_status.user_id = explicit_previous.user_id
  where not history.is_superseded
), ranked as (
  select
    active_monitoring.*,
    row_number() over (
      partition by user_id, stock_id
      order by analyzed_at desc, created_at desc, id desc
    ) as stock_rank,
    row_number() over (
      partition by user_id
      order by analyzed_at desc, created_at desc, id desc
    ) as recent_rank
  from active_monitoring
)
select * from ranked;

revoke all on public.dashboard_monitoring_summary from public, anon, authenticated;
grant select on public.dashboard_monitoring_summary to authenticated;
