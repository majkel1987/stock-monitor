create table public.portfolio_transactions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null,
  stock_id uuid not null,
  transaction_type text not null default 'BUY',
  transaction_date date not null,
  quantity numeric(20, 8) not null,
  price_per_share numeric(20, 6) not null,
  currency character(3) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolio_transactions_user_id_fkey foreign key (user_id)
    references auth.users (id) on delete restrict,
  constraint portfolio_transactions_stock_id_fkey foreign key (stock_id)
    references public.stocks (id) on delete restrict,
  constraint portfolio_transactions_type_check check (transaction_type = 'BUY'),
  constraint portfolio_transactions_quantity_check check (quantity > 0),
  constraint portfolio_transactions_price_check check (price_per_share > 0),
  constraint portfolio_transactions_currency_check check (currency in ('PLN', 'USD'))
);

create index portfolio_transactions_user_stock_date_idx
  on public.portfolio_transactions (user_id, stock_id, transaction_date desc);

create trigger portfolio_transactions_set_updated_at
before update on public.portfolio_transactions
for each row execute function public.set_updated_at();

create or replace function public.enforce_portfolio_transaction_currency()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  stock_currency character(3);
begin
  select currency into stock_currency
  from public.stocks
  where id = new.stock_id;

  if stock_currency is null or new.currency <> stock_currency then
    raise exception using
      errcode = '23514',
      message = 'portfolio transaction currency must match stock currency';
  end if;

  return new;
end;
$$;

create trigger portfolio_transactions_enforce_currency
before insert or update of stock_id, currency on public.portfolio_transactions
for each row execute function public.enforce_portfolio_transaction_currency();

alter table public.portfolio_transactions enable row level security;

create policy portfolio_transactions_owner_select
on public.portfolio_transactions for select to authenticated
using (user_id = auth.uid());

create policy portfolio_transactions_owner_insert
on public.portfolio_transactions for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.watchlist_items
    where watchlist_items.user_id = auth.uid()
      and watchlist_items.stock_id = portfolio_transactions.stock_id
  )
);

create policy portfolio_transactions_owner_update
on public.portfolio_transactions for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.watchlist_items
    where watchlist_items.user_id = auth.uid()
      and watchlist_items.stock_id = portfolio_transactions.stock_id
  )
);

create policy portfolio_transactions_owner_delete
on public.portfolio_transactions for delete to authenticated
using (user_id = auth.uid());

revoke all on public.portfolio_transactions from anon, authenticated;
grant select, insert, update, delete on public.portfolio_transactions to authenticated;
grant all on public.portfolio_transactions to service_role;

revoke all on function public.enforce_portfolio_transaction_currency()
from public, anon, authenticated;
