insert into public.calls (code, name, status)
values ('CONV-2026-INCENTIVOS-REGIONALES', 'Incentivos economicos regionales', 'inactive')
on conflict (code) do update
set
  name = excluded.name,
  status = excluded.status,
  updated_at = now();
