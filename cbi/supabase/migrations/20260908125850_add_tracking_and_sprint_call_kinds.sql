-- Extends the platform content taxonomy with the two placeholder experiences.
alter type public.call_kind add value if not exists 'tracking';
alter type public.call_kind add value if not exists 'sprint';
