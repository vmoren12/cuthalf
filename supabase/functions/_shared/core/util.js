/* COPIA · generado por tools/sync-core.mjs · no se edita aquí:
   el original es src/util.js y hay que volver a sincronizar.      */

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

export const clamp = (v,a,b) => v < a ? a : v > b ? b : v;
