/* La conexión con la clasificación mundial.

   Sin bibliotecas: son un puñado de peticiones y `fetch` las hace
   todas.

   Regla de oro: esto nunca puede romper una partida. Si no hay red,
   si el servidor tarda o si responde cualquier cosa rara, se devuelve
   null y el juego sigue como siempre — guardando en el aparato, que
   es lo que hacía antes de que existiera nada de esto.

   La clave de abajo es pública a propósito: viaja en el navegador de
   cualquiera y sólo da permiso para leer clasificaciones. Escribir
   sólo puede el servidor.                                            */

export const REMOTO = {
  url: "https://gfrmnlxadxtnsimansvt.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmcm1ubHhhZHh0bnNpbWFuc3Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzOTMzMDEsImV4cCI6MjEwMTk2OTMwMX0.5ZfMoRln41V4I-FQzLhag7CtSK8oeh4zXG9mqaKxDD8"
};

export const hayRemoto = () => !!(REMOTO.url && REMOTO.key);

/* lo último que se supo de la conexión, para poder decirlo en pantalla */
export const NET = { vivo: true, ultimoError: "" };

async function pedir(ruta, cuerpo, espera = 9000){
  if (!hayRemoto()) return null;
  try {
    const res = await fetch(REMOTO.url + ruta, {
      method: "POST",
      headers: {
        "apikey": REMOTO.key,
        "Authorization": "Bearer " + REMOTO.key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(cuerpo || {}),
      signal: AbortSignal.timeout(espera)
    });
    const datos = await res.json().catch(() => null);
    if (!res.ok){
      NET.ultimoError = (datos && datos.error) || ("error " + res.status);
      /* que el servidor diga que no es una respuesta, no una avería:
         la conexión funciona                                        */
      NET.vivo = true;
      return { error: NET.ultimoError, estado: res.status };
    }
    NET.vivo = true; NET.ultimoError = "";
    return datos;
  } catch (e){
    NET.vivo = false;
    NET.ultimoError = "sin conexión";
    return null;
  }
}

/* ── clasificaciones (sólo lectura) ─────────────────────────────── */
export const rpc = (nombre, args) => pedir("/rest/v1/rpc/" + nombre, args);

/* El periodo natural de cada familia: el reto de hoy y la tabla de
   siempre. Son las que deciden quién va ganando, y las que se
   consultan para ofrecer un puesto antes de subir.                  */
export const worldFree   = (board, limite = 100) => rpc("free_board",   { p_board: board, p_limit: limite });
export const worldDaily  = (dia, limite = 100)   => rpc("daily_board",  { p_day: dia, p_limit: limite });
export const meFree      = (id, board) => rpc("free_me",   { p_player: id, p_board: board });
export const meDaily     = (id, dia)   => rpc("daily_me",  { p_player: id, p_day: dia });

/* Y los otros dos tramos de cada una: la mejor partida desde una
   fecha acá. Con `desde` a null es «desde siempre», que en el reto es
   un tramo más y en el juego libre ya lo da `free_board`.

   El corte del reto es una fecha suelta y el del juego libre un
   instante: uno se juega por días de calendario y el otro se apunta
   con la hora exacta. Los prepara util.js.                          */
export const worldFreeSpan  = (board, desde, limite = 100) => rpc("free_span",     { p_board: board, p_from: desde, p_limit: limite });
export const worldDailySpan = (desde, limite = 100)        => rpc("daily_span",    { p_from: desde, p_limit: limite });
export const meFreeSpan     = (id, board, desde)           => rpc("free_span_me",  { p_player: id, p_board: board, p_from: desde });
export const meDailySpan    = (id, desde)                  => rpc("daily_span_me", { p_player: id, p_from: desde });

/* ── partidas ───────────────────────────────────────────────────── */
/* El vale y la semilla, antes de empezar a jugar. */
export const runStart = (board, day) => pedir("/functions/v1/run/start", { board, day });

/* Los cortes, al terminar. Lo que vuelve son las cuentas del
   servidor, que son las que valen.                                  */
export const runSubmit = datos => pedir("/functions/v1/run/submit", datos, 15000);
