-- SPLITINHALF · clasificaciones mundiales
-- Paso 1: las tablas y quién puede tocar cada cosa.
--
-- Regla de la casa: el juego SÓLO LEE. Ninguna marca entra desde el
-- navegador; todas pasan por una función del servidor que repite la
-- partida antes de aceptarla. Por eso aquí no hay ni una política de
-- inserción: lo que no se concede, no existe.

-- ══════════════════════════════════════════════════════════════════
-- Jugadores · sin registro
-- Cada aparato se inventa un identificador y un secreto. Aquí se
-- guarda el jugador y, aparte, el hash de ese secreto.
-- ══════════════════════════════════════════════════════════════════
create table public.players (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 1 and 14),
  country     char(2),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- El secreto vive en su propia tabla porque los nombres de la
-- clasificación se leen en abierto y esto no se lee nunca.
create table public.player_secrets (
  player_id   uuid primary key references public.players(id) on delete cascade,
  secret_hash text not null
);

-- ══════════════════════════════════════════════════════════════════
-- Partidas aceptadas · el histórico crudo
-- No lo lee el juego: está para auditar y para mirar una sospecha.
-- ══════════════════════════════════════════════════════════════════
create table public.runs (
  id          bigint generated always as identity primary key,
  player_id   uuid not null references public.players(id) on delete cascade,
  board       text not null check (board in ('daily','free-0','free-10','free-5','free-3')),
  day         date,
  level       int  not null check (level between 1 and 9999),
  accuracy    numeric(4,1) not null check (accuracy between 0 and 100),
  points      int  not null check (points >= 0),
  cuts        int  not null check (cuts >= 0),
  ms          int  not null check (ms >= 0),
  created_at  timestamptz not null default now(),
  -- la fecha es del reto diario y sólo del reto diario
  constraint runs_day_solo_en_el_reto check ((board = 'daily') = (day is not null))
);

create index runs_jugador_idx on public.runs (player_id, created_at desc);
create index runs_tabla_idx   on public.runs (board, created_at desc);

-- ══════════════════════════════════════════════════════════════════
-- Lo que se consulta · una fila por jugador
-- Las clasificaciones no recorren el histórico: leen de aquí.
-- ══════════════════════════════════════════════════════════════════

-- Juego libre: tu mejor partida en cada regla de tiempo.
create table public.free_best (
  player_id   uuid not null references public.players(id) on delete cascade,
  board       text not null check (board in ('free-0','free-10','free-5','free-3')),
  level       int  not null,
  accuracy    numeric(4,1) not null,
  points      int  not null,
  achieved_at timestamptz not null default now(),
  primary key (player_id, board)
);

-- el orden de la tabla: nivel, precisión y, si empatan, quien llegó antes
create index free_best_tabla_idx
  on public.free_best (board, level desc, accuracy desc, achieved_at asc);

-- Reto diario: tu mejor intento de cada día.
create table public.daily_best (
  player_id   uuid not null references public.players(id) on delete cascade,
  day         date not null,
  season      text not null,          -- '2026-08', el mes natural
  level       int  not null,
  accuracy    numeric(4,1) not null,
  points      int  not null,
  tries       int  not null default 1,
  achieved_at timestamptz not null default now(),
  primary key (player_id, day)
);

create index daily_best_dia_idx       on public.daily_best (day, points desc, achieved_at asc);
create index daily_best_temporada_idx on public.daily_best (season, player_id);

-- ══════════════════════════════════════════════════════════════════
-- Permisos
-- Todo cerrado por defecto; se abre sólo la lectura de lo que la
-- clasificación necesita enseñar.
-- ══════════════════════════════════════════════════════════════════
alter table public.players        enable row level security;
alter table public.player_secrets enable row level security;
alter table public.runs           enable row level security;
alter table public.free_best      enable row level security;
alter table public.daily_best     enable row level security;

-- Los nombres de la clasificación son públicos: para eso están.
create policy "los nombres se leen" on public.players
  for select to anon, authenticated using (true);

create policy "el juego libre se lee" on public.free_best
  for select to anon, authenticated using (true);

create policy "el reto diario se lee" on public.daily_best
  for select to anon, authenticated using (true);

-- player_secrets y runs se quedan sin ninguna política: con RLS
-- activada y sin política, nadie ve nada. Sólo el servidor, que va
-- con service_role y se salta RLS por definición.

-- Y por si alguien tocara una política de más: el permiso de escribir
-- no está concedido en ningún caso.
revoke insert, update, delete on public.players,        public.player_secrets,
                                 public.runs,           public.free_best,
                                 public.daily_best      from anon, authenticated;
