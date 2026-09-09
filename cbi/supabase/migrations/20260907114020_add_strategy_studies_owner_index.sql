-- Covers the owner foreign key and owner-scoped study lookups.
create index if not exists strategy_studies_owner_idx
  on public.strategy_studies (owner_user_id);
