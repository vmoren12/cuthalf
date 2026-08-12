-- SPLITINHALF · clasificaciones mundiales
-- Paso 4: los puntos cambian de significado.
--
-- Antes un punto era un nivel: `nivel × 1000 + precisión × 10`, y la
-- clasificación del reto diario sumaba los del mejor intento de cada
-- día del mes. Ahora los puntos se ganan corte a corte —por precisión
-- dentro del margen y por rapidez— y son de la partida y de nadie
-- más. No se acumulan, ni por días ni por meses.
--
-- Tres consecuencias, y esta migración es las tres:
--
--   1. El juego libre ordenaba por nivel y precisión. Ahora ordena por
--      puntos, como el reto, porque son la medida de todo.
--   2. La temporada desaparece. `season_board` y `season_me` sumaban
--      meses; sumar deja de significar algo, así que se van.
--   3. Las marcas guardadas están en la escala vieja —una partida de
--      nivel 13 valía 13.974 puntos, y la mejor de las nuevas ronda
--      los 2.000— así que nadie las alcanzaría nunca. Se vacían.
--
-- La columna `daily_best.season` se queda: no la lee nadie, pero es
-- la forma barata de agrupar por mes el día que haga falta.

-- ══════════════════════════════════════════════════════════════════
-- 1 · Juego libre, ordenado por puntos
-- ══════════════════════════════════════════════════════════════════
create or replace function public.free_board(p_board text, p_limit int default 100)
returns table (pos bigint, player_id uuid, name text, country char(2),
               level int, accuracy numeric, points int, achieved_at timestamptz)
language sql stable
set search_path = public
as $$
  select rank() over (order by b.points desc, b.achieved_at asc),
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
           rank()  over (order by points desc, achieved_at asc) as pos,
           count(*) over () as total
    from public.free_best
    where board = p_board
  )
  select pos, total, level, accuracy, points
  from tabla where player_id = p_player;
$$;

-- el índice acompañaba al orden viejo; con el nuevo no lo usaría nadie
drop index if exists public.free_best_tabla_idx;
create index free_best_tabla_idx
  on public.free_best (board, points desc, achieved_at asc);

-- ══════════════════════════════════════════════════════════════════
-- 2 · Fuera la temporada
-- ══════════════════════════════════════════════════════════════════
drop function if exists public.season_board(text, int);
drop function if exists public.season_me(uuid, text);

-- ══════════════════════════════════════════════════════════════════
-- 3 · Y a empezar de cero
-- Esto BORRA todas las marcas del mundo. Se hace una sola vez, al
-- cambiar la fórmula: mezclar dos escalas deja una clasificación que
-- nadie puede escalar. Los jugadores y sus secretos se quedan — no
-- hay registro, así que perder la identidad sería perder al jugador.
-- ══════════════════════════════════════════════════════════════════
truncate table public.runs restart identity;
delete from public.free_best;
delete from public.daily_best;
