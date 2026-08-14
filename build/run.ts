/* SPLITINHALF · función «run», en un solo fichero.
 *
 * GENERADO por tools/build-function.mjs · no se edita aquí.
 * Los originales son src/*.js, _shared/vale.ts y run/index.ts.
 *
 * Se pega tal cual en el editor de Edge Functions de Supabase, en una
 * función llamada «run». Cada vez que cambie una regla del juego hay
 * que volver a generarlo y a pegarlo, o el servidor puntuará con las
 * reglas viejas.
 */

import { createClient } from "npm:@supabase/supabase-js@2";

/* ══ src/config.js ═════════════════════════════════════════════════ */

/* Configuración · reglas del juego, curva de dificultad y práctica guiada. */

/* ═══════════════════════════════════════════════════════════════
   1 · CONFIGURACIÓN
   ═══════════════════════════════════════════════════════════════ */
export const CONFIG = {
  lives: 3,               // vidas iniciales
  maxLives: 5,            // tope absoluto
  streak: 7,              // aciertos seguidos que dan una vida
  tolerance: 7,          // % de error máximo para superar el nivel
  minSwipe: 26,          // px mínimos de trazo
  hold: { ok: 800, fail: 1150 },
  targetArea: Math.PI,
  /* techo de dificultad: la partida es infinita, pero los parámetros
     dejan de crecer aquí. Más allá es resistencia, no ruleta.      */
  ceiling: { rot: .45, drift: 34, ghost: 700 },
  timers: [0, 10, 5, 3], // segundos por figura · 0 = sin límite
  dailyTimers: [0, 10, 5], // regla de tiempo que puede tocar en el reto
  keep: 100,             // marcas guardadas por cada tabla
  keepDays: 400,         // días del reto diario que se recuerdan
  nameMax: 14
};

export const STAGES = [
  { from: 1,  shapes:["square","circle","triangle"],              rot:0,   drift:0  },
  { from: 3,  shapes:["ngon","convex","triangle"],                rot:.14, drift:0  },
  { from: 5,  shapes:["star","ell","cross","convex"],             rot:.22, drift:0  },
  { from: 7,  shapes:["blob","chevron","comb","star"],            rot:.30, drift:16 },
  { from: 10, shapes:["convex","blob","comb","chevron","ell"],    rot:.40, drift:26, outline:true },
  { from: 13, shapes:["multi","comb","blob","star","ell"],        rot:.10, drift:0,  ghost:1500 }
];

export function levelConfig(n){
  let s = STAGES[0];
  for (const st of STAGES) if (n >= st.from) s = st;
  const over = Math.max(0, n - 16), C = CONFIG.ceiling;
  return {
    shapes : s.shapes,
    rot    : Math.min(C.rot,   (s.rot   || 0) * (1 + over * .05)),
    drift  : Math.min(C.drift, (s.drift || 0) * (1 + over * .05)),
    outline: !!s.outline,
    ghost  : s.ghost ? Math.max(C.ghost, s.ghost - over * 60) : 0
  };
}

/* Práctica guiada: cuatro figuras quietas y sin reloj, una idea cada
   una. `guide` enseña de entrada una línea que sí parte la figura en
   dos; en los pasos que no la traen, aparece sólo si fallas. `ang` es
   la dirección de esa línea, no su altura: la altura se calcula para
   que el reparto sea exacto, así que el consejo nunca miente.      */
export const TUTOR = [
  { shape:"circle",   tip:"tut1", guide:true,  ang:0        },
  { shape:"square",   tip:"tut2", guide:true,  ang:Math.PI/4 },
  { shape:"triangle", tip:"tut3", guide:false, ang:0        },
  { shape:"ell",      tip:"tut4", guide:false, ang:0, rot:.18 }
];


/* ══ src/rng.js ════════════════════════════════════════════════════ */

/* Azar · generador reproducible. El reto diario siembra la misma
   secuencia para todo el mundo, así que la partida es comparable. */

export const TAU = Math.PI * 2;

/* Todo el azar del juego pasa por RNG. En modo libre es Math.random;
   en el reto diario es un generador sembrado con la fecha, así que la
   secuencia de figuras es idéntica para todo el mundo ese día.      */
export let RNG = Math.random;
export function mulberry32(a){
  return function(){
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export const rnd  = (a,b) => a + RNG() * (b - a);
export const rndI = (a,b) => Math.floor(rnd(a, b + 1));
export const pick = a => a[Math.floor(RNG() * a.length)];
/* la partida diaria siembra aquí su secuencia */
export const setRNG = fn => { RNG = fn; };


/* ══ src/util.js ═══════════════════════════════════════════════════ */

/* Utilidades · huella de texto, fecha del día y acotado. */


export const hashStr = str => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
};
export const dayKey = (offset = 0) => {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
};
/* cada día tiene su propia regla de tiempo, sorteada por la fecha */
export const dayTimer = key => CONFIG.dailyTimers[hashStr("t" + key) % CONFIG.dailyTimers.length];

/* ── dónde empieza un tramo de la clasificación ───────────────────
   «Hoy» y «este mes» son del reloj de quien juega, no del servidor.
   El histórico del juego libre se guarda en UTC, y a la una de la
   madrugada en Madrid el día de UTC todavía es el de ayer: preguntar
   allí por «hoy» devolvería la tabla de otro día. Por eso el corte se
   resuelve aquí, que es el único sitio que sabe en qué huso estamos,
   y viaja como instante exacto.                                     */
export const startOfToday = () => { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString(); };
export const startOfMonth = () => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d.toISOString(); };
/* el reto se juega por días de calendario y se guarda por fecha
   suelta, así que su corte del mes es el día 1 y no un instante   */
export const monthKey = () => dayKey().slice(0, 8) + "01";

export const clamp = (v,a,b) => v < a ? a : v > b ? b : v;


/* ══ src/scoring.js ════════════════════════════════════════════════ */

/* Puntuación · el criterio que ordena a los jugadores del mundo.

   Sin nada del navegador: este fichero se copia tal cual al servidor,
   que tiene que puntuar exactamente igual que aquí. Si cambia una
   fórmula, cambia allí.                                              */


/* ── lo que vale un corte ─────────────────────────────────────────
   Los puntos se ganan corte a corte y no salen de ningún otro sitio:
   ni del nivel al que se llegó, ni de los días que se lleva jugando.
   Un fallo no resta, simplemente no puntúa.

   La precisión se mide contra el margen, no contra el cien por cien:
   entre el corte perfecto y el que se salva por los pelos hay siete
   puntos porcentuales, y todo lo demás ya no es juego sino fallo.
   Repartir los cien puntos en esa franja es lo único que distingue de
   verdad un corte bueno de uno que ha colado.

   El tiempo multiplica: ×2 si sale en segundo y medio o menos, ×1 a
   los cuatro y medio, y de ahí baja hasta un suelo de ×0,5. Por
   arriba se satura a propósito. El reloj de cada corte lo apunta el
   navegador y viaja con la partida, así que por debajo de `fast` no
   queda nada que ganar declarando prisas imposibles — es la única
   cifra de la partida que el servidor no puede recalcular por su
   cuenta, y conviene que mentir no pague.                            */
export const CUT = { base: 100, fast: 1.5, par: 4.5, top: 2, floor: .5 };

export const timeFactor = ms => {
  const s = Math.max(0, ms) / 1000;
  return Math.min(CUT.top, Math.max(CUT.floor,
    CUT.top - (s - CUT.fast) / (CUT.par - CUT.fast)));
};

export const cutPoints = (err, ms) => err >= CONFIG.tolerance ? 0
  : Math.round(CUT.base * (1 - err / CONFIG.tolerance) * timeFactor(ms));

/* Orden de una clasificación: los puntos de la partida y, a igualdad,
   quien llegó antes. Llegar lejos sigue puntuando —cada nivel es un
   corte más— pero ya no puntúa por sí mismo: se paga por cómo se
   corta, no por cuántas veces.                                       */
export const cmp = (a, b) => b.pts - a.pts || a.ts - b.ts;

/* Las clasificaciones. El juego libre va separado por regla de
   tiempo: sin límite y con tres segundos por figura no son el mismo
   juego, y mezclarlos no dice nada de nadie.                        */
export const BOARDS = ["daily", "free-0", "free-10", "free-5", "free-3"];
export const freeBoard = tl => "free-" + (tl || 0);
export const boardTime = board => board.startsWith("free-") ? +board.slice(5) : null;
export const isBoard = board => BOARDS.includes(board);


/* ══ src/geometry.js ═══════════════════════════════════════════════ */

/* Geometría · área, centroide, corte por una recta y evaluación
   del reparto. Todo son funciones puras: el servidor las reutiliza
   para comprobar las partidas. */


export const area = p => { let a = 0; for (let i = 0, n = p.length; i < n; i++){ const q = p[(i+1)%n]; a += p[i].x*q.y - q.x*p[i].y; } return a/2; };
export const centroid = p => {
  let a = 0, x = 0, y = 0;
  for (let i = 0, n = p.length; i < n; i++){
    const b = p[(i+1)%n], f = p[i].x*b.y - b.x*p[i].y;
    a += f; x += (p[i].x + b.x) * f; y += (p[i].y + b.y) * f;
  }
  a *= .5; return a ? { x: x/(6*a), y: y/(6*a) } : { x:0, y:0 };
};

/* Recorte por semiplano (Sutherland–Hodgman). Válido también en
   polígonos cóncavos: los puentes degenerados aportan área nula. */
export function clipHalf(poly, P, N, sign){
  const out = [], n = poly.length;
  for (let i = 0; i < n; i++){
    const a = poly[i], b = poly[(i+1)%n];
    const da = sign * ((a.x-P.x)*N.x + (a.y-P.y)*N.y);
    const db = sign * ((b.x-P.x)*N.x + (b.y-P.y)*N.y);
    if (da >= 0) out.push(a);
    if ((da > 0 && db < 0) || (da < 0 && db > 0)){
      const t = da / (da - db);
      out.push({ x: a.x + (b.x-a.x)*t, y: a.y + (b.y-a.y)*t });
    }
  }
  return out;
}

export function evaluate(parts, P, N){
  const A = [], B = []; let aA = 0, aB = 0;
  for (const p of parts){
    const a = clipHalf(p, P, N,  1), b = clipHalf(p, P, N, -1);
    if (a.length > 2){ A.push(a); aA += Math.abs(area(a)); }
    if (b.length > 2){ B.push(b); aB += Math.abs(area(b)); }
  }
  const tot = aA + aB;
  return { A, B, aA, aB, err: tot > 0 ? Math.abs(aA - aB) / tot * 100 : 100 };
}

/* Corte que parte de verdad la figura en dos, en la dirección `ang`.
   Se busca la altura por bisección: pasar por el centro de áreas no
   basta — en un triángulo, una recta cualquiera por el baricentro se
   va hasta el 11 % y la pista del tutorial suspendería su propio
   examen.                                                          */
export function bisector(parts, ang){
  const N = { x: -Math.sin(ang), y: Math.cos(ang) };
  const c = partsCentroid(parts);
  let R = 1;
  for (const p of parts) for (const v of p) R = Math.max(R, Math.hypot(v.x - c.x, v.y - c.y));
  let lo = -R, hi = R, P = c;
  for (let i = 0; i < 22; i++){
    const mid = (lo + hi) / 2;
    P = { x: c.x + N.x*mid, y: c.y + N.y*mid };
    const r = evaluate(parts, P, N);
    if (r.aA > r.aB) lo = mid; else hi = mid;
  }
  return { P, N, R };
}
/* centro de masas de un conjunto de polígonos */
export function partsCentroid(list){
  let a = 0, x = 0, y = 0;
  for (const p of list){ const ar = Math.abs(area(p)), c = centroid(p); a += ar; x += c.x*ar; y += c.y*ar; }
  return a ? { x: x/a, y: y/a } : { x:0, y:0 };
}

export function normalize(parts){
  let tot = 0, cx = 0, cy = 0;
  for (const p of parts){ const a = Math.abs(area(p)), c = centroid(p); tot += a; cx += c.x*a; cy += c.y*a; }
  cx /= tot; cy /= tot;
  const s = Math.sqrt(CONFIG.targetArea / tot);
  return parts.map(p => p.map(v => ({ x:(v.x-cx)*s, y:(v.y-cy)*s })));
}


/* ══ src/shapes.js ═════════════════════════════════════════════════ */

/* Catálogo de figuras. */


export const ring = (n, r, phase=0) => Array.from({length:n}, (_,i) => {
  const a = phase + i*TAU/n, k = typeof r === "function" ? r(a,i) : r;
  return { x: Math.cos(a)*k, y: Math.sin(a)*k };
});

export const SHAPES = {
  circle:   () => [ ring(160, 1) ],
  square:   () => [ ring(4, 1, Math.PI/4) ],
  triangle: () => [ ring(3, 1, -Math.PI/2) ],
  ngon:     () => [ ring(rndI(5,8), 1, rnd(0,TAU)) ],

  convex: () => {
    const n = rndI(5,9), p = [];
    for (let i = 0; i < n; i++){
      const a = i*TAU/n + rnd(-.22,.22)*TAU/n, r = rnd(.6, 1.1);
      p.push({ x: Math.cos(a)*r, y: Math.sin(a)*r });
    }
    return [p];
  },

  star: () => {
    const n = rndI(5,7), k = rnd(.38,.6), p = [];
    for (let i = 0; i < n*2; i++){
      const a = i*Math.PI/n, r = i % 2 ? k : 1;
      p.push({ x: Math.cos(a)*r, y: Math.sin(a)*r });
    }
    return [p];
  },

  blob: () => {
    const f1 = rnd(0,TAU), f2 = rnd(0,TAU), f3 = rnd(0,TAU);
    return [ ring(180, a => 1 + .22*Math.sin(3*a+f1) + .12*Math.sin(5*a+f2) + .045*Math.sin(7*a+f3)) ];
  },

  ell: () => {
    const w = rnd(.5,.85);
    return [[ {x:-.9,y:-.9},{x:.9,y:-.9},{x:.9,y:-.9+w},{x:-.9+w,y:-.9+w},{x:-.9+w,y:.9},{x:-.9,y:.9} ]];
  },

  cross: () => {
    const w = rnd(.28,.42);
    return [[ {x:-w,y:-1},{x:w,y:-1},{x:w,y:-w},{x:1,y:-w},{x:1,y:w},{x:w,y:w},
              {x:w,y:1},{x:-w,y:1},{x:-w,y:w},{x:-1,y:w},{x:-1,y:-w},{x:-w,y:-w} ]];
  },

  chevron: () => {
    const d = rnd(.35,.75);
    return [[ {x:-.7,y:-1},{x:.1,y:-1},{x:.95,y:0},{x:.1,y:1},{x:-.7,y:1},{x:-.7+d,y:0} ]];
  },

  comb: () => {
    const t = rndI(3,4), w = 2/(2*t-1), base = rnd(-.35,-.1), p = [{x:-1,y:-.9},{x:1,y:-.9}];
    for (let i = t-1; i >= 0; i--){
      const xr = -1 + (2*i+1)*w, xl = -1 + 2*i*w;
      p.push({x:xr,y:.9},{x:xl,y:.9});
      if (i > 0) p.push({x:xl,y:base},{x:-1+(2*i-1)*w,y:base});
    }
    return [p];
  },

  /* Piezas separadas: el área ya no está en un solo bloque. */
  multi: () => {
    const a = pick([ ring(120,1), ring(4,1,Math.PI/4), ring(3,1,-Math.PI/2) ]);
    const b = pick([ ring(120,1), ring(4,1,Math.PI/4), ring(6,1) ]);
    const ka = rnd(.5,.7), kb = rnd(.35,.55), dy = rnd(-.3,.3);
    return [
      a.map(v => ({ x: v.x*ka - .8, y: v.y*ka - dy })),
      b.map(v => ({ x: v.x*kb + .95, y: v.y*kb + dy }))
    ];
  }
};


/* ══ src/replay.js ═════════════════════════════════════════════════ */

/* Repetición de una partida.

   El juego es determinista: con la misma semilla salen las mismas
   figuras en el mismo orden. Así que una partida entera cabe en una
   lista de cortes, y a partir de ahí se puede volver a jugar sola.

   Esto es lo que ejecuta el servidor para saber qué pasó de verdad.
   No compara con lo que diga el navegador: lo calcula él. Si alguien
   manda cortes inventados, saldrá el nivel que esos cortes merecen.

   Sin DOM, sin reloj, sin nada de fuera: las mismas cuentas aquí y
   allí. Si cambia una regla del juego, cambia aquí y hay que volver a
   desplegar el servidor.                                             */


/* La figura de un nivel. Consume el azar exactamente en el mismo
   orden que newLevel(), que es lo que mantiene las dos partidas —la
   jugada y la repetida— en el mismo sitio de la secuencia.          */
export function levelShape(level, lastShape){
  const cfg = levelConfig(level);
  let pool = cfg.shapes;
  if (pool.length > 1 && lastShape){
    const f = pool.filter(x => x !== lastShape);
    if (f.length) pool = f;
  }
  const name  = pick(pool);
  const shape = normalize(SHAPES[name]());
  RNG(); RNG();          // el giro inicial y su sentido, que aquí no pintan
  return { name, shape, cfg };
}

/* events: [{ P:{x,y}, N:{x,y}, ms } | { timeout:true, ms }]
   Devuelve el resultado de la partida y el detalle corte a corte.   */
export function replay(seed, events, timeLimit = 0){
  setRNG(mulberry32(seed >>> 0));

  let level = 1, lives = CONFIG.lives, streak = 0, last = null, pts = 0;
  const cuts = [], detail = [];
  let over = false, reason = "";

  for (const ev of events){
    if (over){ reason = "sobran cortes después del final"; break; }

    const { shape, name } = levelShape(level, last);
    last = name;

    /* el reloj de la figura no admite discusión */
    if (timeLimit && ev.ms > timeLimit * 1000 + 400){
      reason = "un corte llega fuera de tiempo";
      break;
    }

    if (ev.timeout){
      if (!timeLimit){ reason = "se agota un tiempo que no existe"; break; }
      streak = 0; lives--;
      detail.push({ level, timeout: true });
    } else {
      const r  = evaluate(shape, ev.P, ev.N);
      const ok = r.err < CONFIG.tolerance;
      /* aquí es donde se ganan los puntos: en el corte, por lo fino y
         por lo rápido. El navegador ha sumado esto mismo en directo
         con el mismo error y el mismo reloj, así que las dos cuentas
         tienen que salir clavadas.                                   */
      const p = cutPoints(r.err, ev.ms);
      pts += p;
      cuts.push(100 - r.err);
      detail.push({ level, err: r.err, ok, pts: p });
      if (ok){
        streak++;
        if (streak >= CONFIG.streak){
          streak = 0;
          if (lives < CONFIG.maxLives) lives++;
        }
        level++;
      } else {
        streak = 0; lives--;
      }
    }
    if (lives <= 0) over = true;
  }

  const avg = cuts.length ? cuts.reduce((a, b) => a + b, 0) / cuts.length : 0;
  return {
    ok: !reason,
    reason,
    over,                                  // ¿se quedó sin vidas?
    level,
    lives,
    cuts: cuts.length,
    av: +avg.toFixed(1),
    points: pts,
    detail
  };
}

/* Un corte hecho en la pantalla, en coordenadas de la figura.

   La pantalla la coloca una rotación, una escala y un desplazamiento
   (ver paint), así que deshacerlos es girar al revés y descontar. El
   error de un corte es una proporción de áreas, y eso no cambia por
   mover, girar o agrandar: el servidor mide lo mismo sin saber nada
   del tamaño del móvil ni de en qué instante se cortó.              */
export function toShapeSpace(tf, P, N){
  const u = (P.x - tf.cx) / tf.sc, v = (P.y - tf.cy) / tf.sc;
  return {
    P: { x:  u * tf.c + v * tf.s, y: -u * tf.s + v * tf.c },
    N: { x:  N.x * tf.c + N.y * tf.s, y: -N.x * tf.s + N.y * tf.c }
  };
}

/* redondeo corto: la partida viaja por la red y no hacen falta
   dieciséis decimales para cortar una figura                        */
export const trim = n => Math.round(n * 1e5) / 1e5;


/* ══ supabase/functions/_shared/vale.ts ════════════════════════════ */

/* El vale de una partida.

   Se entrega al empezar y hay que devolverlo al terminar. Lleva
   dentro la semilla, el reloj y la hora, y va firmado: el navegador
   puede leerlo, pero no puede cambiarle una coma sin que la firma
   deje de cuadrar. La llave está sólo aquí, en el servidor.

   Sirve para tres cosas: que la semilla la reparta el servidor y no
   el jugador, que se sepa cuándo empezó la partida, y que la misma
   partida no se pueda entregar dos veces.                           */

const codificador = new TextEncoder();

const aBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const deBase64Url = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));

async function llave(secreto: string){
  return await crypto.subtle.importKey(
    "raw", codificador.encode(secreto),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
  );
}

export interface Vale {
  s: number;            // semilla
  b: string;            // tabla
  d: string | null;     // día, sólo en el reto diario
  t: number;            // segundos por figura, 0 = sin límite
  i: number;            // cuándo se entregó
  j: string;            // identificador único, para que no se repita
}

export async function firmar(vale: Vale, secreto: string): Promise<string> {
  const cuerpo = aBase64Url(codificador.encode(JSON.stringify(vale)));
  const firma  = new Uint8Array(await crypto.subtle.sign("HMAC", await llave(secreto), codificador.encode(cuerpo)));
  return cuerpo + "." + aBase64Url(firma);
}

/* Devuelve el vale si la firma cuadra y no ha caducado; si no, null.
   No dice qué ha fallado: a quien lo esté probando no se le explica. */
export async function comprobar(texto: unknown, secreto: string, maxHoras = 6): Promise<Vale | null> {
  if (typeof texto !== "string" || texto.length > 1024) return null;
  const [cuerpo, firma] = texto.split(".");
  if (!cuerpo || !firma) return null;

  let vale: Vale;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC", await llave(secreto), deBase64Url(firma), codificador.encode(cuerpo)
    );
    if (!ok) return null;
    vale = JSON.parse(new TextDecoder().decode(deBase64Url(cuerpo)));
  } catch { return null; }

  const edad = Date.now() - vale.i;
  if (!(edad >= -60_000 && edad < maxHoras * 3600_000)) return null;  // ni del futuro ni de anteayer
  return vale;
}

/* Del secreto del aparato sólo se guarda su huella. */
export async function huella(secreto: string): Promise<string> {
  const b = new Uint8Array(await crypto.subtle.digest("SHA-256", codificador.encode(secreto)));
  return [...b].map(x => x.toString(16).padStart(2, "0")).join("");
}


/* ══ supabase/functions/run/index.ts ═══════════════════════════════ */

/* SPLITINHALF · la puerta de la clasificación mundial.
 *
 * Tres llamadas:
 *
 *   POST /run/start   { board, day? }
 *        → { seed, tl, ticket }          la semilla y el vale firmado
 *
 *   POST /run/submit  { ticket, cuts, player:{id,secret}, name }
 *        → { level, av, points, best }   lo que el servidor calcula
 *
 *   POST /run/name    { player:{id,secret}, name }
 *        → { ok, nuevo }                 sólo cambiar de nombre
 *
 * La segunda no cree lo que le cuentan: vuelve a jugar la partida con
 * las mismas reglas que el navegador —los ficheros de _shared/core son
 * copias literales de src/— y guarda su propio resultado. Quien mande
 * cortes inventados recibirá el nivel que esos cortes merecen.
 */


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

/* Quién dice ser, con la forma que se le dio: el identificador es
   público —sale en la clasificación— y el secreto no sale del aparato.
   Lo comprueban las dos llamadas que escriben, así que vive aquí.   */
const jugadorValido = (id: unknown, secreto: unknown) =>
  typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id) &&
  typeof secreto === "string" && secreto.length >= 20 && secreto.length <= 200;

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
  if (!jugadorValido(id, secreto))
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
  /* lo que no cuadra es el identificador con su secreto, no el nombre:
     los nombres se repiten sin problema, y decir «ese nombre es de otro
     aparato» mandaba a probar otro, que tampoco iba a funcionar.     */
  if (ok.data === false) return responder({ error: "este jugador es de otro aparato" }, 403, origen);

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

/* ── renombrar ─────────────────────────────────────────────────── */
/* El nombre es del jugador, no de la partida: las clasificaciones lo
   leen de `players`, así que cambiarlo cambia todas tus marcas a la
   vez. Eso ya era así; lo que no había era manera de cambiarlo sin
   entregar una partida, y quien se renombraba seguía saliendo con el
   nombre viejo hasta que volvía a subir algo.

   No crea a nadie: quien todavía no ha subido ninguna partida no está
   en la clasificación, y de ahí vuelve un «nuevo» que para quien
   pregunta no es un error — su nombre subirá con la primera.        */
async function renombrar(cuerpo: any, origen: string | null){
  const id = cuerpo?.player?.id, secreto = cuerpo?.player?.secret;
  if (!jugadorValido(id, secreto))
    return responder({ error: "jugador mal identificado" }, 400, origen);

  const { data, error } = await db.rpc("rename_player", {
    p_id: id, p_name: limpiarNombre(cuerpo?.name), p_hash: await huella(secreto)
  });
  if (error) return responder({ error: "no se ha podido cambiar el nombre" }, 500, origen);
  if (data === "ajeno") return responder({ error: "este jugador es de otro aparato" }, 403, origen);

  return responder({ ok: true, nuevo: data === "nuevo" }, 200, origen);
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
    if (camino === "name")   return await renombrar(cuerpo, origen);
    return responder({ error: "no existe" }, 404, origen);
  } catch (e) {
    console.error(e);
    return responder({ error: "algo ha ido mal" }, 500, origen);
  }
});
