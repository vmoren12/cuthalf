-- SPLITINHALF · clasificaciones mundiales
-- Paso 2: cómo se leen.
--
-- Siete funciones y ninguna sorpresa: tres devuelven una tabla del
-- mundo y tres te sitúan a ti dentro de ella. Todas son `stable` y de
-- sólo lectura, y ninguna es `security definer`: se ejecutan con los
-- permisos de quien llama, que sobre estas tablas es leer y nada más.
--
-- El puesto se calcula SIEMPRE sobre la clasificación entera y sólo
-- después se recorta: si no, el número 1 de una página no sería el
-- número 1 del mundo.

-- ══════════════════════════════════════════════════════════════════
-- Juego libre · una tabla por regla de tiempo
-- ══════════════════════════════════════════════════════════════════
create or replace function public.free_board(p_board text, p_limit int default 100)
returns table (pos bigint, player_id uuid, name text, country char(2),
               level int, accuracy numeric, points int, achieved_at timestamptz)
language sql stable
set search_path = public
as $$
  select rank() over (order by b.level desc, b.accuracy desc, b.achieved_at asc),
         p.id, p.name, p.country, b.level, b.accuracy, b.points, b.achieved_at
  from public.free_best b
  join public.players p on p.id = b.player_id
  where b.board = p_board
  order by 1
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

create or replace function public.free_me(p_player uuid, p_board text)
returns table (pos bigint, total bigint, level int, accuracy numeric, points int)
language sql stable
set search_path = public
as $$
  with tabla as (
    select player_id, level, accuracy, points,
           rank()  over (order by level desc, accuracy desc, achieved_at asc) as pos,
           count(*) over () as total
    from public.free_best
    where board = p_board
  )
  select pos, total, level, accuracy, points
  from tabla where player_id = p_player;
$$;

-- ══════════════════════════════════════════════════════════════════
-- Reto diario · el día suelto
-- ══════════════════════════════════════════════════════════════════
create or replace function public.daily_board(p_day date, p_limit int default 100)
returns table (pos bigint, player_id uuid, name text, country char(2),
               level int, accuracy numeric, points int, tries int)
language sql stable
set search_path = public
as $$
  select rank() over (order by b.points desc, b.achieved_at asc),
         p.id, p.name, p.country, b.level, b.accuracy, b.points, b.tries
  from public.daily_best b
  join public.players p on p.id = b.player_id
  where b.day = p_day
  order by 1
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

create or replace function public.daily_me(p_player uuid, p_day date)
returns table (pos bigint, total bigint, level int, accuracy numeric, points int, tries int)
language sql stable
set search_path = public
as $$
  with tabla as (
    select player_id, level, accuracy, points, tries,
           rank()  over (order by points desc, achieved_at asc) as pos,
           count(*) over () as total
    from public.daily_best
    where day = p_day
  )
  select pos, total, level, accuracy, points, tries
  from tabla where player_id = p_player;
$$;

-- ══════════════════════════════════════════════════════════════════
-- Reto diario · la temporada
-- Suma los puntos del mejor intento de cada día del mes. Los empates
-- los rompe quien llegó antes a ese total.
-- ══════════════════════════════════════════════════════════════════
create or replace function public.season_board(p_season text, p_limit int default 100)
returns table (pos bigint, player_id uuid, name text, country char(2),
               points bigint, days bigint)
language sql stable
set search_path = public
as $$
  select rank() over (order by sum(b.points) desc, min(b.achieved_at) asc),
         p.id, p.name, p.country,
         sum(b.points)::bigint, count(*)::bigint
  from public.daily_best b
  join public.players p on p.id = b.player_id
  where b.season = p_season
  group by p.id, p.name, p.country
  order by 1
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

create or replace function public.season_me(p_player uuid, p_season text)
returns table (pos bigint, total bigint, points bigint, days bigint)
language sql stable
set search_path = public
as $$
  with suma as (
    select player_id, sum(points) as pts, count(*) as dias, min(achieved_at) as desde
    from public.daily_best
    where season = p_season
    group by player_id
  ), tabla as (
    select player_id, pts, dias,
           rank()  over (order by pts desc, desde asc) as pos,
           count(*) over () as total
    from suma
  )
  select pos, total, pts::bigint, dias::bigint
  from tabla where player_id = p_player;
$$;

-- ══════════════════════════════════════════════════════════════════
-- Cuánta gente hay en cada tabla · para decir «mejor que el 92%»
-- ══════════════════════════════════════════════════════════════════
create or replace function public.board_size(p_board text, p_season text default null)
returns bigint
language sql stable
set search_path = public
as $$
  select case
    when p_board = 'daily' then (select count(distinct player_id) from public.daily_best where season = p_season)
    else                        (select count(*)                 from public.free_best  where board  = p_board)
  end;
$$;

-- Se llaman desde el navegador con la clave pública, que sólo puede leer.
grant execute on function public.free_board(text, int)    to anon, authenticated;
grant execute on function public.free_me(uuid, text)      to anon, authenticated;
grant execute on function public.daily_board(date, int)   to anon, authenticated;
grant execute on function public.daily_me(uuid, date)     to anon, authenticated;
grant execute on function public.season_board(text, int)  to anon, authenticated;
grant execute on function public.season_me(uuid, text)    to anon, authenticated;
grant execute on function public.board_size(text, text)   to anon, authenticated;
