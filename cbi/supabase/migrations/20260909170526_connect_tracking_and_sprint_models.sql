-- Connects the initial tracking and sprint records to their shared model pages.
update public.calls
set
  route_path = case kind
    when 'tracking' then './seguimiento-demo.html'
    when 'sprint' then './sprint-demo.html'
    else route_path
  end,
  updated_at = now()
where kind in ('tracking', 'sprint');
