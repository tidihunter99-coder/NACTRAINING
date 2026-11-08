-- Execute somente no SQL Editor do projeto NAC autorizado.
-- A consulta não grava nem altera objetos. Ela preserva dinamicamente todos os
-- campos existentes em public.exercises, incluindo IDs e referências de mídia.
select jsonb_build_object(
  'exported_at', now(),
  'schema', 'public',
  'table', 'exercises',
  'count', count(*),
  'exercises', coalesce(jsonb_agg(to_jsonb(e) order by e.name), '[]'::jsonb)
) as nac_catalog_export
from public.exercises e
where e.visibility = 'academy';
