with upserted_call as (
  insert into public.calls (code, name, status)
  values ('CONV-2026-INNOVAE-FRIO', 'INNOVAE frio', 'active')
  on conflict (code) do update
  set
    name = excluded.name,
    status = excluded.status,
    updated_at = now()
  returning id
)
insert into public.call_questions (
  call_id,
  question_key,
  label,
  help_text,
  max_score,
  sort_order,
  is_required
)
select
  upserted_call.id,
  question_key,
  label,
  help_text,
  max_score,
  sort_order,
  is_required
from upserted_call
cross join (
  values
    (
      'coste_elegible_eur',
      'Coste elegible',
      'Coste elegible del proyecto en euros. Minimo de convocatoria: 100000 EUR.',
      40,
      10,
      true
    ),
    (
      'ahorro_kwh_ano',
      'Ahorro anual previsto',
      'Ahorro de energia final anual previsto. El baremo trabaja en ktep.',
      40,
      20,
      true
    ),
    (
      'ayuda_solicitada_eur',
      'Ayuda solicitada',
      'Ayuda publica solicitada en euros. Maximo por proyecto: 2000000 EUR.',
      25,
      30,
      true
    ),
    (
      'categoria_innovacion',
      'Grado de innovacion',
      'Categoria cualitativa del anexo 3: baja, incremental, intermedia o disruptiva.',
      25,
      40,
      true
    ),
    (
      'bonus_socioeconomico',
      'Beneficio socioeconomico',
      'Proyecto ubicado en municipio de reto demografico o transicion justa.',
      10,
      50,
      true
    )
) as questions(question_key, label, help_text, max_score, sort_order, is_required)
on conflict (call_id, question_key) do update
set
  label = excluded.label,
  help_text = excluded.help_text,
  max_score = excluded.max_score,
  sort_order = excluded.sort_order,
  is_required = excluded.is_required,
  updated_at = now();
