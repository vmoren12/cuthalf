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

import { CONFIG, levelConfig } from "./config.js";
import { RNG, TAU, mulberry32, pick, setRNG } from "./rng.js";
import { SHAPES } from "./shapes.js";
import { evaluate, normalize } from "./geometry.js";
import { cutPoints } from "./scoring.js";

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
