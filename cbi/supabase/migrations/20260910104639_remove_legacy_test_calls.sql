-- Removes the three placeholder calls created with the initial prototype.
delete from public.calls
where code in (
  'CONV-2026-001',
  'CONV-2026-002',
  'CONV-2026-003'
);
