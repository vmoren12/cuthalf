/* Tablas de marcas.

   Una tabla es una lista de filas ya formateadas: puesto, nombre,
   cifra grande y cifra pequeña. Da igual si las filas salen de este
   aparato o de la clasificación mundial, y por eso pintar y obtener
   están separados.                                                  */

import { $ } from "./state.js";
import { DAILY, DB } from "./storage.js";
import { freeBoard, seasonOf } from "./scoring.js";
import { T } from "./i18n.js";
import { NET, meFree, meSeason, worldFree, worldSeason } from "./net.js";
import { ME } from "./player.js";
import { dayKey } from "./util.js";

const cell = (c, txt) => { const s = document.createElement("span"); s.className = c; s.textContent = txt; return s; };

/* rows: [{ r, n, l, a, me }] · r puesto · n nombre · l nivel · a precisión */
export function drawRows(el, rows, note){
  el.innerHTML = "";
  if (!rows.length){
    const li = document.createElement("li");
    li.className = "empty"; li.textContent = note || T("empty");
    el.appendChild(li); return;
  }
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
    n: d.pts.toLocaleString() + " pts",     // si no, es un número suelto
    l: levelText(d.lv),
    a: d.av.toFixed(1) + "%"
  }));
}

/* ── el mundo ─────────────────────────────────────────────────────
   En el reto diario la tabla mundial es la de la temporada: los
   puntos acumulados del mes, que es lo que se compite. El día suelto
   se ve al terminar de jugarlo.

   Si tu marca queda fuera de los cien primeros, se añade tu fila al
   final: una clasificación en la que no te encuentras no dice nada. */
export async function worldRows(board){
  const yo = ME.id();
  const mes = seasonOf(dayKey());

  const [lista, mio] = board === "daily"
    ? await Promise.all([worldSeason(mes), meSeason(yo, mes)])
    : await Promise.all([worldFree(board), meFree(yo, board)]);

  if (!Array.isArray(lista)) return { rows: [], nota: NET.vivo ? T("notSent") : T("noNet") };

  const fila = r => board === "daily"
    ? { r: String(r.pos), n: r.name, l: Number(r.points).toLocaleString(), a: r.days + " " + T("days"), me: r.player_id === yo }
    : { r: String(r.pos), n: r.name, l: levelText(r.level), a: Number(r.accuracy).toFixed(1) + "%", me: r.player_id === yo };

  const rows = lista.map(fila);
  if (!rows.length) return { rows: [], nota: T("worldEmpty") };

  /* ¿estás en la lista? Si no, tu puesto va al final */
  const yoDentro = rows.some(r => r.me);
  const m = Array.isArray(mio) ? mio[0] : null;
  if (!yoDentro && m){
    rows.push(board === "daily"
      ? { r: String(m.pos), n: DB.name() || "—", l: Number(m.points).toLocaleString(), a: m.days + " " + T("days"), me: true }
      : { r: String(m.pos), n: DB.name() || "—", l: levelText(m.level), a: Number(m.accuracy).toFixed(1) + "%", me: true });
  }
  return { rows, nota: m ? T("rankOf")(m.pos, m.total) : "" };
}

/* la tabla que se pinta al terminar una partida libre */
export function drawTable(el, max, mark, tl){
  drawRows(el, localRuns(freeBoard(tl), max, mark));
}

/* Lo mejor que tengas, en la portada.

   El nombre sobra —eres tú— y en su sitio va el reloj con el que se
   hizo, que es lo que distingue una marca de otra. Si sólo juegas el
   reto diario no tienes marcas de juego libre, así que ahí se enseñan
   los puntos de la temporada: antes esa gente veía siempre un guion.  */
export function drawBest(){
  const b = DB.list()[0];
  if (b){
    $("best-val").textContent = levelText(b.lv) + " · " + (b.tl ? b.tl + " s" : "∞");
    return;
  }
  /* Quien sólo juega el reto no tiene marcas de juego libre. Se le
     enseña su mejor día en el mismo idioma que ve al jugar —nivel y
     precisión—, no en puntos: los puntos son cosa de la temporada, y
     aquí no habría con qué compararlos.                             */
  const dias = Object.values(DB.days());
  const mejor = dias.sort((x, y) => y.lv - x.lv || y.av - x.av)[0];
  $("best-val").textContent = mejor
    ? levelText(mejor.lv) + " · " + T("dailyShort")
    : "—";
}
