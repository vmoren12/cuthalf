-- CUTHALF · clasificaciones mundiales
-- Paso 3: la puerta de entrada.
--
-- Estas dos funciones son las únicas que escriben, y no puede
-- llamarlas el navegador: al final del fichero se les quita el
-- permiso a todo el mundo salvo al servidor. Van con `security
-- definer` porque tienen que tocar tablas que nadie más puede tocar.

-- El vale de la partida, para que una misma no se entregue dos veces.
alter table public.runs add column token_jti text not null;
create unique index runs_vale_idx on public.runs (token_jti);

-- ══════════════════════════════════════════════════════════════════
-- Alta y reconocimiento de un jugador
-- Sin registro: el aparato trae su identificador y su secreto. La
-- primera vez se apunta; a partir de ahí, el secreto es lo único que
-- demuestra que sigues siendo tú. Quien no lo acierte, no entra.
-- ══════════════════════════════════════════════════════════════════
create or replace function public.ensure_player(
  p_id      uuid,
  p_name    text,
  p_hash    text,
  p_country char(2) default null
) returns boolean
language plpgsql security definer set search_path = public
as $$
declare v_hash text;
begin
  select secret_hash into v_hash from player_secrets where player_id = p_id;

  if v_hash is null then
    insert into players (id, name, country) values (p_id, p_name, p_country)
      on conflict (id) do nothing;
    insert into player_secrets (player_id, secret_hash) values (p_id, p_hash)
      on conflict (player_id) do nothing;
    return true;
  end if;

  -- el identificador es público en la clasificación; el secreto no.
  -- Sin él, no se puede jugar con el nombre de otro.
  if v_hash <> p_hash then
    return false;
  end if;

  update players
     set name = p_name,
         country = coalesce(p_country, country),
         updated_at = now()
   where id = p_id;
  return true;
end $$;

-- ══════════════════════════════════════════════════════════════════
-- Entrega de una partida ya comprobada
-- Lo que llega aquí son las cuentas del servidor, no las del
-- navegador. Esta función sólo guarda y decide si mejora la marca.
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

  insert into runs (player_id, board, day, level, accuracy, points, cuts, ms, token_jti)
  values (p_player, p_board, p_day, p_level, p_accuracy, p_points, p_cuts, p_ms, p_jti);

  if p_board = 'daily' then
    select points into v_prev from daily_best
     where player_id = p_player and day = p_day;

    if v_prev is null then
      insert into daily_best (player_id, day, season, level, accuracy, points, tries)
      values (p_player, p_day, to_char(p_day, 'YYYY-MM'), p_level, p_accuracy, p_points, 1);
      v_best := true;
    elsif p_points > v_prev then
      update daily_best
         set level = p_level, accuracy = p_accuracy, points = p_points,
             tries = tries + 1, achieved_at = now()
       where player_id = p_player and day = p_day;
      v_best := true;
    else
      -- el intento cuenta aunque no mejore: la cuenta de intentos es
      -- parte del reto
      update daily_best set tries = tries + 1
       where player_id = p_player and day = p_day;
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
-- Y la parte que de verdad cierra la puerta.
-- Sin esto, cualquiera con la clave pública podría llamar a
-- submit_run y escribirse el nivel que quisiera.
-- ══════════════════════════════════════════════════════════════════
revoke execute on function public.ensure_player(uuid, text, text, char)
  from public, anon, authenticated;
revoke execute on function public.submit_run(uuid, text, date, int, numeric, int, int, int, text)
  from public, anon, authenticated;
