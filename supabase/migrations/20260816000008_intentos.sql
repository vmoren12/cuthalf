-- SPLITINHALF · clasificaciones mundiales
-- Paso 8: fuera la cuenta de intentos.
--
-- `daily_best.tries` contaba cuántas veces se había jugado el reto de
-- un día. No la lee nadie: las clasificaciones enseñan puesto, nombre,
-- puntos y nivel, y ninguna ordena por ella —`daily_board` y
-- `daily_span` ordenan por puntos y desempatan por quién llegó antes—.
-- La pintaba el monolito de antes de trocear el juego en módulos, y al
-- trocearlo se quedó por el camino.
--
-- Se quita porque era el último efecto que tenía subir una partida que
-- no mejora nada: una columna que crecía sin que nadie la viera, y con
-- ella la única excusa para ofrecer un botón que no cambia nada. Los
-- puntos son de la partida; cuántas veces se ha intentado no es asunto
-- de ninguna tabla.
--
-- El aparato sigue contando sus propios intentos del día, en su
-- almacén y para su uso: es lo que decide si una partida lleva el
-- sello de récord. Eso ni se publica ni ordena a nadie.

-- ══════════════════════════════════════════════════════════════════
-- 1 · Las lecturas, fuera mientras dure la mudanza
-- Devuelven una columna menos, así que no vale `create or replace`.
-- Son de sólo lectura: mientras no estén, una clasificación falla y
-- el juego sigue jugándose, que es la regla de siempre.
-- ══════════════════════════════════════════════════════════════════
drop function if exists public.daily_board(date, int);
drop function if exists public.daily_me(uuid, date);
drop function if exists public.daily_span(date, int);
drop function if exists public.daily_span_me(uuid, date);

-- ══════════════════════════════════════════════════════════════════
-- 2 · La entrega deja de contarlos
-- Sin `tries`, una partida del reto que no mejora no tiene nada que
-- hacer en `daily_best`: la rama entera sobra. Queda igual que el
-- juego libre, que nunca tuvo qué apuntar en ese caso.
-- ══════════════════════════════════════════════════════════════════
create or replace function public.submit_run(
  p_player   uuid,
  p_board    text,
  p_day      date,
  p_level    int,
  p_accuracy numeric,
  p_points   int,
  p_cuts     int,
  p_ms       int,
  p_jti      text
) returns table (accepted boolean, best boolean, reason text)
language plpgsql security definer set search_path = public
as $$
declare
  v_prev   int;
  v_recent int;
  v_best   boolean := false;
begin
  -- nadie juega sesenta partidas en una hora; quien lo intente, no es
  -- un jugador con prisa
  select count(*) into v_recent
    from runs
   where player_id = p_player
     and created_at > now() - interval '1 hour';
  if v_recent >= 60 then
    return query select false, false, 'demasiadas partidas seguidas';
    return;
  end if;

  -- El histórico entra siempre. No es sólo auditoría: es la única
  -- fuente de los tramos «hoy» y «mes» del juego libre, que se quedan
  -- con la mejor partida de cada uno dentro del tramo. Por eso el
  -- navegador ofrece subir la mejor partida del día aunque no llegue
  -- al récord de siempre — si no llegara aquí, esos dos tramos no la
  -- verían nunca.
  insert into runs (player_id, board, day, level, accuracy, points, cuts, ms, token_jti)
  values (p_player, p_board, p_day, p_level, p_accuracy, p_points, p_cuts, p_ms, p_jti);

  if p_board = 'daily' then
    select points into v_prev from daily_best
     where player_id = p_player and day = p_day;

    if v_prev is null then
      insert into daily_best (player_id, day, season, level, accuracy, points)
      values (p_player, p_day, to_char(p_day, 'YYYY-MM'), p_level, p_accuracy, p_points);
      v_best := true;
    elsif p_points > v_prev then
      update daily_best
         set level = p_level, accuracy = p_accuracy, points = p_points,
             achieved_at = now()
       where player_id = p_player and day = p_day;
      v_best := true;
    end if;

  else
    select points into v_prev from free_best
     where player_id = p_player and board = p_board;

    if v_prev is null then
      insert into free_best (player_id, board, level, accuracy, points)
      values (p_player, p_board, p_level, p_accuracy, p_points);
      v_best := true;
    elsif p_points > v_prev then
      update free_best
         set level = p_level, accuracy = p_accuracy, points = p_points, achieved_at = now()
       where player_id = p_player and board = p_board;
      v_best := true;
    end if;
  end if;

  return query select true, v_best, ''::text;
end $$;

-- ══════════════════════════════════════════════════════════════════
-- 3 · Y la columna
-- Las funciones de arriba son `language sql` con el cuerpo en una
-- cadena, así que PostgreSQL no anota que dependen de ella: dejarlas
-- puestas no habría impedido este `drop`, sólo habría dejado cuatro
-- funciones rotas. Por eso se retiran antes y se rehacen después.
-- ══════════════════════════════════════════════════════════════════
alter table public.daily_best drop column tries;

-- ══════════════════════════════════════════════════════════════════
-- 4 · Las lecturas otra vez, iguales menos la columna que sobraba
-- ══════════════════════════════════════════════════════════════════
create or replace function public.daily_board(p_day date, p_limit int default 100)
returns table (pos bigint, player_id uuid, name text, country char(2),
               level int, accuracy numeric, points int)
language sql stable
set search_path = public
as $$
  select rank() over (order by b.points desc, b.achieved_at asc),
         p.id, p.name, p.country, b.level, b.accuracy, b.points
  from public.daily_best b
  join public.players p on p.id = b.player_id
  where b.day = p_day
  order by 1
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

create or replace function public.daily_me(p_player uuid, p_day date)
returns table (pos bigint, total bigint, level int, accuracy numeric, points int)
language sql stable
set search_path = public
as $$
  with tabla as (
    select player_id, level, accuracy, points,
           rank()  over (order by points desc, achieved_at asc) as pos,
           count(*) over () as total
    from public.daily_best
    where day = p_day
  )
  select pos, total, level, accuracy, points
  from tabla where player_id = p_player;
$$;

create or replace function public.daily_span(p_from date default null,
                                             p_limit int default 100)
returns table (pos bigint, player_id uuid, name text, country char(2),
               level int, accuracy numeric, points int, day date)
language sql stable
set search_path = public
as $$
  with mejor as (
    select distinct on (b.player_id)
           b.player_id, b.level, b.accuracy, b.points, b.day, b.achieved_at
    from public.daily_best b
    where p_from is null or b.day >= p_from
    order by b.player_id, b.points desc, b.achieved_at asc
  )
  select rank() over (order by m.points desc, m.achieved_at asc),
         p.id, p.name, p.country, m.level, m.accuracy, m.points, m.day
  from mejor m
  join public.players p on p.id = m.player_id
  order by 1
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

create or replace function public.daily_span_me(p_player uuid,
                                                p_from date default null)
returns table (pos bigint, total bigint, level int, accuracy numeric,
               points int)
language sql stable
set search_path = public
as $$
  with mejor as (
    select distinct on (player_id)
           player_id, level, accuracy, points, achieved_at
    from public.daily_best
    where p_from is null or day >= p_from
    order by player_id, points desc, achieved_at asc
  ), tabla as (
    select player_id, level, accuracy, points,
           rank()  over (order by points desc, achieved_at asc) as pos,
           count(*) over () as total
    from mejor
  )
  select pos, total, level, accuracy, points
  from tabla where player_id = p_player;
$$;

-- ══════════════════════════════════════════════════════════════════
-- Permisos
-- Al retirar una función se va con ella su lista de permisos, así que
-- hay que volver a concederlos. Los mismos que tenían: leer, a la
-- clave pública. `submit_run` conserva los suyos —un `create or
-- replace` no los toca— y los suyos son ninguno.
-- ══════════════════════════════════════════════════════════════════
grant execute on function public.daily_board(date, int)     to anon, authenticated;
grant execute on function public.daily_me(uuid, date)       to anon, authenticated;
grant execute on function public.daily_span(date, int)      to anon, authenticated;
grant execute on function public.daily_span_me(uuid, date)  to anon, authenticated;

notify pgrst, 'reload schema';
