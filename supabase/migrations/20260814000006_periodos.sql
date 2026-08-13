-- SPLITINHALF · clasificaciones mundiales
-- Paso 6: mirar una clasificación por tramos de tiempo.
--
-- Las cinco tablas nacieron cada una en un extremo del eje del tiempo,
-- y sin que nadie lo decidiera: el reto diario enseña el día de hoy
-- porque su gracia es que las figuras son las mismas para todos, y el
-- juego libre enseña la mejor partida de siempre porque `free_best`
-- guarda una sola fila por jugador. Faltaba el medio —«este mes»— y
-- el extremo contrario de cada una.
--
-- Esto NO es la temporada que se borró en el paso 4. Allí se SUMABAN
-- los puntos del mejor intento de cada día del mes, y sumar dejó de
-- significar algo cuando los puntos pasaron a ser de una partida.
-- Aquí se sigue midiendo UNA partida: la mejor del tramo. Los puntos
-- siguen sin acumularse, ni por días ni por meses.
--
-- Las funciones que ya había no se tocan. `daily_board` sigue siendo
-- el reto de hoy y `free_board` la tabla de siempre: son el periodo
-- natural de cada familia, las que deciden quién va ganando de verdad
-- y las que consulta el puesto que se ofrece antes de subir. Lo que
-- se añade aquí rellena los otros dos huecos de cada una.

-- ══════════════════════════════════════════════════════════════════
-- Reto diario · el mejor día de cada uno dentro del tramo
--
-- `daily_best` ya tiene una fila por jugador y día, así que el tramo
-- es un `where` y quedarse con el mejor día de cada uno, un
-- `distinct on`. Con `p_from` a null es «desde siempre».
--
-- El corte llega como fecha suelta, no como instante: el reto se
-- juega por días de calendario y así se guarda.
-- ══════════════════════════════════════════════════════════════════
create or replace function public.daily_span(p_from date default null,
                                             p_limit int default 100)
returns table (pos bigint, player_id uuid, name text, country char(2),
               level int, accuracy numeric, points int, tries int, day date)
language sql stable
set search_path = public
as $$
  with mejor as (
    select distinct on (b.player_id)
           b.player_id, b.level, b.accuracy, b.points, b.tries, b.day, b.achieved_at
    from public.daily_best b
    where p_from is null or b.day >= p_from
    order by b.player_id, b.points desc, b.achieved_at asc
  )
  select rank() over (order by m.points desc, m.achieved_at asc),
         p.id, p.name, p.country, m.level, m.accuracy, m.points, m.tries, m.day
  from mejor m
  join public.players p on p.id = m.player_id
  order by 1
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

create or replace function public.daily_span_me(p_player uuid,
                                                p_from date default null)
returns table (pos bigint, total bigint, level int, accuracy numeric,
               points int, tries int)
language sql stable
set search_path = public
as $$
  with mejor as (
    select distinct on (player_id)
           player_id, level, accuracy, points, tries, achieved_at
    from public.daily_best
    where p_from is null or day >= p_from
    order by player_id, points desc, achieved_at asc
  ), tabla as (
    select player_id, level, accuracy, points, tries,
           rank()  over (order by points desc, achieved_at asc) as pos,
           count(*) over () as total
    from mejor
  )
  select pos, total, level, accuracy, points, tries
  from tabla where player_id = p_player;
$$;

-- ══════════════════════════════════════════════════════════════════
-- Juego libre · el mejor de cada uno dentro del tramo
--
-- Aquí no hay atajo: `free_best` guarda la mejor partida de siempre y
-- nada más, así que si la tuya fue en julio, tu mejor de agosto no
-- está en ninguna parte. El histórico completo sólo vive en `runs`.
--
-- Y `runs` tiene RLS con CERO políticas a propósito: es el registro
-- crudo, sirve para auditar y no se le enseña a nadie. Por eso estas
-- dos son las únicas `security definer` del proyecto, y por eso se
-- las ata corto:
--
--   · devuelven exactamente lo que ya enseña la clasificación —quién
--     y su mejor puntuación del tramo—, nunca una fila cruda ni el
--     histórico de nadie. Filtran menos de lo que `free_board` filtra;
--     no enseñan más;
--   · la tabla pedida se comprueba contra una lista blanca, así que
--     no hay forma de colar 'daily' ni un valor inventado;
--   · el `execute` se retira de `public` y se concede a mano, que si
--     no lo trae puesto por defecto todo el mundo.
--
-- El corte llega como instante exacto y no como fecha, porque
-- `created_at` es UTC y «hoy» es del reloj de quien juega: a la una
-- de la madrugada en Madrid, el día de UTC todavía es el de ayer. Se
-- resuelve en el navegador, que es el único que sabe en qué huso está.
-- ══════════════════════════════════════════════════════════════════
create or replace function public.free_span(p_board text,
                                            p_from timestamptz default null,
                                            p_limit int default 100)
returns table (pos bigint, player_id uuid, name text, country char(2),
               level int, accuracy numeric, points int, achieved_at timestamptz)
language sql stable
security definer
set search_path = public
as $$
  with mejor as (
    select distinct on (r.player_id)
           r.player_id, r.level, r.accuracy, r.points, r.created_at
    from public.runs r
    where p_board in ('free-0','free-10','free-5','free-3')
      and r.board = p_board
      and (p_from is null or r.created_at >= p_from)
    order by r.player_id, r.points desc, r.created_at asc
  )
  select rank() over (order by m.points desc, m.created_at asc),
         p.id, p.name, p.country, m.level, m.accuracy, m.points, m.created_at
  from mejor m
  join public.players p on p.id = m.player_id
  order by 1
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

create or replace function public.free_span_me(p_player uuid, p_board text,
                                               p_from timestamptz default null)
returns table (pos bigint, total bigint, level int, accuracy numeric, points int)
language sql stable
security definer
set search_path = public
as $$
  with mejor as (
    select distinct on (r.player_id)
           r.player_id, r.level, r.accuracy, r.points, r.created_at
    from public.runs r
    where p_board in ('free-0','free-10','free-5','free-3')
      and r.board = p_board
      and (p_from is null or r.created_at >= p_from)
    order by r.player_id, r.points desc, r.created_at asc
  ), tabla as (
    select player_id, level, accuracy, points,
           rank()  over (order by points desc, created_at asc) as pos,
           count(*) over () as total
    from mejor
  )
  select pos, total, level, accuracy, points
  from tabla where player_id = p_player;
$$;

-- el tramo se recorre por tabla y fecha, que es justo el índice que
-- ya había para auditar; el mejor de cada jugador se ordena después
-- sobre lo que quede, que en este juego cabe de sobra en memoria

-- ══════════════════════════════════════════════════════════════════
-- Permisos
-- Las del reto van con los permisos de quien llama, como todas las
-- demás: `daily_best` ya se lee en abierto. Las del juego libre no,
-- así que se les quita el `execute` que traen de serie.
-- ══════════════════════════════════════════════════════════════════
grant execute on function public.daily_span(date, int)           to anon, authenticated;
grant execute on function public.daily_span_me(uuid, date)       to anon, authenticated;

revoke execute on function public.free_span(text, timestamptz, int)      from public;
revoke execute on function public.free_span_me(uuid, text, timestamptz)  from public;
grant  execute on function public.free_span(text, timestamptz, int)      to anon, authenticated;
grant  execute on function public.free_span_me(uuid, text, timestamptz)  to anon, authenticated;

-- Supabase recarga el esquema de la API por su cuenta, pero avisar no
-- cuesta nada y ahorra el rato de creer que la migración no ha
-- entrado cuando lo que pasa es que la API todavía no la ha visto.
notify pgrst, 'reload schema';
