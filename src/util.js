/* Utilidades · huella de texto, fecha del día y acotado. */

import { CONFIG } from "./config.js";

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
