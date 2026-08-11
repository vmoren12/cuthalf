/* SPLITINHALF · la puerta de la clasificación mundial.
 *
 * Dos llamadas:
 *
 *   POST /run/start   { board, day? }
 *        → { seed, tl, ticket }          la semilla y el vale firmado
 *
 *   POST /run/submit  { ticket, cuts, player:{id,secret}, name }
 *        → { level, av, points, best }   lo que el servidor calcula
 *
 * La segunda no cree lo que le cuentan: vuelve a jugar la partida con
 * las mismas reglas que el navegador —los ficheros de _shared/core son
 * copias literales de src/— y guarda su propio resultado. Quien mande
 * cortes inventados recibirá el nivel que esos cortes merecen.
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { replay } from "../_shared/core/replay.js";
import { hashStr, dayTimer } from "../_shared/core/util.js";
import { isBoard, boardTime } from "../_shared/core/scoring.js";
import { comprobar, firmar, huella, type Vale } from "../_shared/vale.ts";

const SECRETO = Deno.env.get("RUN_SECRET") ?? "";
const ORIGENES = (Deno.env.get("ALLOWED_ORIGINS") ?? "*").split(",").map(s => s.trim());

const MAX_CORTES = 2000;
const NOMBRE_MAX = 14;

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

/* ── cortesías ─────────────────────────────────────────────────── */
function cors(origen: string | null){
  const permitido = ORIGENES.includes("*") ? "*"
                  : (origen && ORIGENES.includes(origen) ? origen : ORIGENES[0]);
  return {
    "Access-Control-Allow-Origin": permitido,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}
const responder = (cuerpo: unknown, estado: number, origen: string | null) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...cors(origen), "Content-Type": "application/json" }
  });

/* ── comprobaciones de lo que llega ────────────────────────────── */
const numero = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/* El día lo pone el jugador, porque «hoy» depende de dónde estés. Pero
   no puede ser cualquiera: con husos de -12 a +14, el hoy de nadie se
   aleja más de un día del hoy en Greenwich.                         */
function diaValido(dia: unknown): dia is string {
  if (typeof dia !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return false;
  const suyo = Date.parse(dia + "T00:00:00Z");
  if (Number.isNaN(suyo)) return false;
  return Math.abs(suyo - Date.now()) < 36 * 3600_000;
}

/* nombre: lo que se ve en la clasificación, así que ni líneas nuevas
   ni caracteres invisibles con los que colarse en la tabla          */
function limpiarNombre(n: unknown): string {
  if (typeof n !== "string") return "—";
  const limpio = n
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NOMBRE_MAX);
  return limpio || "—";
}

function cortesValidos(cuts: unknown): cuts is any[] {
  if (!Array.isArray(cuts) || cuts.length === 0 || cuts.length > MAX_CORTES) return false;
  return cuts.every(c => {
    if (!c || typeof c !== "object") return false;
    if (!numero(c.ms) || c.ms < 0 || c.ms > 3600_000) return false;
    if (c.timeout === true) return true;
    return c.P && c.N && numero(c.P.x) && numero(c.P.y) && numero(c.N.x) && numero(c.N.y)
        && Math.abs(c.P.x) < 1e4 && Math.abs(c.P.y) < 1e4;
  });
}

/* ── empezar ───────────────────────────────────────────────────── */
async function empezar(cuerpo: any, origen: string | null){
  const board = cuerpo?.board;
  if (!isBoard(board)) return responder({ error: "tabla desconocida" }, 400, origen);

  let semilla: number, tl: number, dia: string | null = null;

  if (board === "daily"){
    if (!diaValido(cuerpo?.day)) return responder({ error: "día fuera de rango" }, 400, origen);
    dia = cuerpo.day;
    semilla = hashStr(dia);              // el reto es el mismo para todo el mundo
    tl = dayTimer(dia);
  } else {
    /* La semilla del juego libre la reparte el servidor. Si la eligiera
       el jugador podría probar mil hasta dar con una cómoda y quedarse
       con esa.                                                        */
    semilla = crypto.getRandomValues(new Uint32Array(1))[0];
    tl = boardTime(board) ?? 0;
  }

  const vale: Vale = { s: semilla, b: board, d: dia, t: tl, i: Date.now(), j: crypto.randomUUID() };
  return responder({ seed: semilla, tl, ticket: await firmar(vale, SECRETO) }, 200, origen);
}

/* ── entregar ──────────────────────────────────────────────────── */
async function entregar(cuerpo: any, origen: string | null){
  const vale = await comprobar(cuerpo?.ticket, SECRETO);
  if (!vale) return responder({ error: "vale no válido o caducado" }, 403, origen);

  if (!cortesValidos(cuerpo?.cuts)) return responder({ error: "cortes mal formados" }, 400, origen);

  const id = cuerpo?.player?.id, secreto = cuerpo?.player?.secret;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id) ||
      typeof secreto !== "string" || secreto.length < 20 || secreto.length > 200)
    return responder({ error: "jugador mal identificado" }, 400, origen);

  /* Una partida lleva su tiempo: cada corte pide su gesto y su pausa.
     Cien cortes en tres segundos no son una partida.                */
  const transcurrido = Date.now() - vale.i;
  if (transcurrido < cuerpo.cuts.length * 250)
    return responder({ error: "la partida ha ido demasiado deprisa" }, 403, origen);

  /* aquí es donde se vuelve a jugar */
  const r = replay(vale.s, cuerpo.cuts, vale.t);
  if (!r.ok) return responder({ error: r.reason }, 403, origen);

  const ok = await db.rpc("ensure_player", {
    p_id: id, p_name: limpiarNombre(cuerpo?.name), p_hash: await huella(secreto)
  });
  if (ok.error)  return responder({ error: "no se ha podido registrar el jugador" }, 500, origen);
  if (ok.data === false) return responder({ error: "ese nombre es de otro aparato" }, 403, origen);

  const { data, error } = await db.rpc("submit_run", {
    p_player: id, p_board: vale.b, p_day: vale.d,
    p_level: r.level, p_accuracy: r.av, p_points: r.points,
    p_cuts: r.cuts, p_ms: Math.min(transcurrido, 2147483647), p_jti: vale.j
  });

  /* el índice único del vale: la misma partida no entra dos veces */
  if (error) return responder({ error: /duplicate|unique/i.test(error.message)
    ? "esta partida ya se había entregado" : "no se ha podido guardar" }, 403, origen);

  const fila = Array.isArray(data) ? data[0] : data;
  if (!fila?.accepted) return responder({ error: fila?.reason || "rechazada" }, 429, origen);

  return responder({ level: r.level, av: r.av, points: r.points, best: fila.best }, 200, origen);
}

/* ── entrada ───────────────────────────────────────────────────── */
Deno.serve(async req => {
  const origen = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origen) });
  if (req.method !== "POST")    return responder({ error: "sólo POST" }, 405, origen);
  if (!SECRETO)                 return responder({ error: "servidor sin configurar" }, 500, origen);

  let cuerpo: any;
  try { cuerpo = await req.json(); }
  catch { return responder({ error: "cuerpo ilegible" }, 400, origen); }

  /* El país iría aquí, sacado de una cabecera de geolocalización. No
     hay ninguna: Supabase no la pasa. La columna `country` se queda en
     la base de datos por si algún día se añade un servicio que lo
     resuelva, pero nadie la escribe ni la enseña.                    */
  const camino = new URL(req.url).pathname.split("/").filter(Boolean).pop();

  try {
    if (camino === "start")  return await empezar(cuerpo, origen);
    if (camino === "submit") return await entregar(cuerpo, origen);
    return responder({ error: "no existe" }, 404, origen);
  } catch (e) {
    console.error(e);
    return responder({ error: "algo ha ido mal" }, 500, origen);
  }
});
