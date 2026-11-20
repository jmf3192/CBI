-- Extend the existing panel; retain PAID-ARAGON as the stable access code.
alter table public.paid_aragon_applications
 add column assessment jsonb not null default '{}'::jsonb check (jsonb_typeof(assessment)='object'),
 add column schema_version integer not null default 2;
alter table public.paid_aragon_awards
 add column import_key text unique,
 add column case_id text,
 add column line text,
 add column result_status text not null default 'concedida' check (result_status in ('concedida','lista_espera','no_elegible','desistida','anulada','renuncia_lista_espera')),
 add column score numeric(8,2),
 add column investment_reference numeric(14,2),
 add column waiting_amount numeric(14,2),
 add column sector text not null default 'otros' check (sector in ('otros','fertilizantes','nutricion_animal','revision_sectorial')),
 add column sector_confidence text not null default 'sin_clasificar',
 add column sector_basis text,
 add column sector_source_url text,
 add column source_file text,
 add column source_page integer,
 add column source_refs jsonb not null default '[]'::jsonb,
 add column extraction_method text,
 add column financial_validated boolean not null default false,
 add column notes text not null default '',
 add column dataset_date date;
create index paid_aragon_awards_sector_idx on public.paid_aragon_awards(sector);
comment on column public.paid_aragon_awards.granted_amount is 'Published grant; not a payment. Waiting-list amounts are in waiting_amount and must not be counted as grants.';
comment on column public.paid_aragon_awards.sector is 'Classification of beneficiary activity, not a verified description of the funded project.';
comment on column public.paid_aragon_applications.assessment is 'Private 2027 preflight inputs and criterion evidence references, versioned by the frontend rules.';
update public.calls set name='PAIP Aragón · TDI-FEDER',description='Solicitud TDI-FEDER 2027: elegibilidad, evaluación e históricos 2021–2026 con foco en fertilizantes y nutrición animal.' where code='PAID-ARAGON';
