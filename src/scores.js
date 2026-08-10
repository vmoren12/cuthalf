/* Tablas de marcas.

   Una tabla es una lista de filas ya formateadas: puesto, nombre,
   cifra grande y cifra pequeña. Da igual si las filas salen de este
   aparato o de la clasificación mundial, y por eso pintar y obtener
   están separados.                                                  */

import { $ } from "./state.js";
import { DAILY, DB } from "./storage.js";
import { freeBoard } from "./scoring.js";
import { T } from "./i18n.js";

const cell = (c, txt) => { const s = document.createElement("span"); s.className = c; s.textContent = txt; return s; };

/* rows: [{ r, n, l, a, me }] · r puesto · n nombre · l nivel · a precisión */
export function drawRows(el, rows, note){
  el.innerHTML = "";
  if (!rows.length){ el.innerHTML = '<li class="empty">' + T("empty") + '</li>'; return; }
  for (const row of rows){
    const li = document.createElement("li");
    if (row.me) li.className = "me";
    li.append(cell("r", row.r), cell("n", row.n), cell("l", row.l), cell("a", row.a));
    el.appendChild(li);
  }
  if (note){
    const li = document.createElement("li");
    li.className = "empty"; li.textContent = note;
    el.appendChild(li);
  }
}

export const levelText = lv => "N." + String(lv).padStart(2, "0");

/* las marcas de este aparato en una de las tablas de juego libre */
export function localRuns(board, max, mark){
  return DB.list(board).slice(0, max).map((r, i) => ({
    r: String(i+1).padStart(2,"0"),
    n: r.n,
    l: levelText(r.lv),
    a: r.av.toFixed(1) + "%",
    me: !!mark && r.ts === mark
  }));
}

/* tus días del reto en la temporada en curso, del más reciente al
   más antiguo: es tu propio historial, no una comparación          */
export function localSeason(){
  return DAILY.season().days.slice().reverse().map(d => ({
    r: d.d.slice(8),
    n: d.pts.toLocaleString(),
    l: levelText(d.lv),
    a: d.av.toFixed(1) + "%"
  }));
}

/* la tabla que se pinta al terminar una partida libre */
export function drawTable(el, max, mark, tl){
  drawRows(el, localRuns(freeBoard(tl), max, mark));
}

export function drawBest(){
  const b = DB.list()[0];
  $("best-val").textContent = b ? b.n + " · " + levelText(b.lv) : "—";
}
