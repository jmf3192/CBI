-- The public panel only needs corporate tax identifiers.
UPDATE public.paid_aragon_awards
SET enrichment = regexp_replace(enrichment::text, '"([0-9]{8}|[XYZ][0-9]{7})[A-Z]"', '""', 'g')::jsonb
WHERE enrichment::text ~ '"([0-9]{8}|[XYZ][0-9]{7})[A-Z]"';
