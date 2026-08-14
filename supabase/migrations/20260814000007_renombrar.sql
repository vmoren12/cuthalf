-- SPLITINHALF · clasificaciones mundiales
-- Paso 7: cambiar de nombre sin tener que jugar otra partida.
--
-- El nombre es una columna de `players`, y las cinco clasificaciones lo
-- sacan de ahí con un join. Por eso cambiarlo cambia todas tus marcas a
-- la vez, las de hoy y las de cualquier día ya cerrado: sin cuentas, la
-- identidad es el secreto del aparato y el nombre sólo es la etiqueta
-- con la que se te pinta. Es la decisión, no un descuido — congelar el
-- nombre en cada marca dejaría a un mismo jugador con tres nombres
-- distintos en tres días del mismo tramo, y una errata sería para
-- siempre, porque aquí no hay cuenta que recuperar.
--
-- Lo que faltaba era poder cambiarlo. El único sitio donde se escribía
-- el nombre era `ensure_player`, al entregar una partida, así que quien
-- se cambiaba el nombre seguía saliendo con el viejo en la
-- clasificación hasta que volvía a subir algo. Un cambio que dice
-- «guardado» y no se ve en ninguna parte parece una avería.
--
-- No reutiliza `ensure_player` a propósito: aquélla CREA el jugador si
-- no lo conoce, y un jugador sin partidas no debe existir. A la
-- clasificación se entra jugando; si se pudiera renombrar sin haber
-- jugado, se podrían apalabrar nombres sin tocar el juego.

create or replace function public.rename_player(
  p_id   uuid,
  p_name text,
  p_hash text
) returns text
language plpgsql security definer set search_path = public
as $$
declare v_hash text;
begin
  select secret_hash into v_hash from player_secrets where player_id = p_id;

  -- nadie a quien renombrar, y no es un fallo: es alguien que todavía
  -- no ha subido ninguna partida. Su nombre entrará con la primera.
  if v_hash is null then return 'nuevo'; end if;

  -- el identificador es público, porque sale en la clasificación; el
  -- secreto no. Sin él no se renombra a nadie.
  if v_hash <> p_hash then return 'ajeno'; end if;

  update players set name = p_name, updated_at = now() where id = p_id;
  return 'ok';
end $$;

-- como las otras dos que escriben: sólo la llama la función del
-- servidor, que va con la clave de servicio
revoke execute on function public.rename_player(uuid, text, text)
  from public, anon, authenticated;
