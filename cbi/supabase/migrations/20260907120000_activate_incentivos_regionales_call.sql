update public.calls
set
  status = 'active',
  updated_at = now()
where code = 'CONV-2026-INCENTIVOS-REGIONALES';
