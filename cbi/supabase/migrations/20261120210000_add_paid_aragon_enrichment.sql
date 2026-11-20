-- Additional public project metadata; existing financial fields, access policies and private drafts are preserved.
alter table public.paid_aragon_awards add column enrichment jsonb not null default '{}'::jsonb check (jsonb_typeof(enrichment) = 'object');
comment on column public.paid_aragon_awards.enrichment is 'Source-backed FEDER project operations and separate company antecedents. Operation costs do not replace PAIP grants or eligible project investment.';
