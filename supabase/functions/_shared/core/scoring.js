/* COPIA · generado por tools/sync-core.mjs · no se edita aquí:
   el original es src/scoring.js y hay que volver a sincronizar.      */

/* Puntuación · el criterio que ordena a los jugadores del mundo.

   Sin nada del navegador: este fichero se copia tal cual al servidor,
   que tiene que puntuar exactamente igual que aquí. Si cambia una
   fórmula, cambia allí.                                              */

import { CONFIG } from "./config.js";

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
