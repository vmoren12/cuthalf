/* Tablas de marcas.

   Una tabla es una lista de filas ya formateadas: puesto, quién o
   cuándo, puntos y nivel. Da igual si las filas salen de este aparato
   o de la clasificación mundial, y por eso pintar y obtener están
   separados.

   Todas llevan cabecera. Cuatro columnas de cifras sin nombre no se
   entienden —la primera, un puesto de dos dígitos, se leía como si
   fuera parte de la marca— y ponerles nombre cuesta una fila.       */

import { DAILY, DB } from "./storage.js";
import { freeBoard } from "./scoring.js";
import { T, lang } from "./i18n.js";
import { NET, meDaily, meDailySpan, meFree, meFreeSpan,
         worldDaily, worldDailySpan, worldFree, worldFreeSpan } from "./net.js";
import { ME } from "./player.js";
import { dayKey, monthKey, startOfMonth, startOfToday } from "./util.js";

/* cuántas filas se traen de una tabla del mundo. Más allá de aquí no
   se puede contar nada, y decirlo es mejor que inventarlo.          */
const TOPE = 100;

const cell = (c, txt) => { const s = document.createElement("span"); s.className = c; s.textContent = txt; return s; };

/* la cabecera de una tabla: la segunda columna es lo único que cambia
   —quién, o qué día— porque las otras tres son siempre las mismas   */
export const cabecera = quien => ({ r:"#", n:T(quien), l:T("colPts"), a:T("colLvl") });

/* rows: [{ r, n, l, a, me }] · r puesto · n quién o cuándo · l puntos · a nivel */
export function drawRows(el, rows, note, head){
  el.innerHTML = "";
  if (!rows.length){
    const li = document.createElement("li");
    li.className = "empty"; li.textContent = note || T("empty");
    el.appendChild(li); return;
  }
  if (head){
    const li = document.createElement("li");
    li.className = "head";
    li.append(cell("r", head.r), cell("n", head.n), cell("l", head.l), cell("a", head.a));
    el.appendChild(li);
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
export const ptsText = p => Number(p || 0).toLocaleString();

/* «2026-08-12» → «12 ago», que es como se lee un día del calendario.
   Lo traduce el navegador y así no hay doce nombres de mes por idioma
   en el diccionario.                                                */
export const dayText = iso => {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang, { day:"2-digit", month:"short" });
};

/* ── desde cuándo ─────────────────────────────────────────────────
   El tramo que se está mirando —hoy, este mes o siempre— traducido a
   las dos formas en que este juego guarda el tiempo: las partidas
   llevan el instante en que se jugaron y los días del reto, la fecha
   suelta del calendario. `all` no tiene corte, y por eso es null.  */
export const spanInstant = span => span === "today" ? startOfToday() : span === "month" ? startOfMonth() : null;
export const spanDay     = span => span === "today" ? dayKey()       : span === "month" ? monthKey()     : null;

/* el corte en milisegundos, que es como apunta la hora una marca, y
   si cae dentro. Sin fecha no se puede afirmar que sea de hoy: las
   marcas de las versiones viejas sólo salen cuando no hay corte.   */
export const spanCut = span => { const d = spanInstant(span); return d ? Date.parse(d) : 0; };
export const inSpan  = (r, corte) => !corte || (!!r.ts && r.ts >= corte);

/* qué decir cuando el tramo se queda sin nada: que no haya marcas de
   hoy no es lo mismo que no haber jugado nunca, y la tabla vacía sin
   más lo diría mal                                                  */
export const notaVacia = (span, quien) =>
  span === "today" ? T(quien + "EmptyToday") :
  span === "month" ? T(quien + "EmptyMonth") : "";

/* las marcas de este aparato en una de las tablas de juego libre */
export function localRuns(board, max, mark, span){
  const corte = spanCut(span);
  return DB.list(board)
    .filter(r => inSpan(r, corte))
    .slice(0, max)
    .map((r, i) => ({
      r: String(i+1).padStart(2,"0"),
      n: r.n,
      l: ptsText(r.pts),
      a: levelText(r.lv),
      me: !!mark && r.ts === mark
    }));
}

/* Tus días del reto, el mejor primero.

   Antes iban por fecha, del más reciente al más antiguo, y el día del
   mes hacía de primera columna sin decir que lo era. Ahora es una
   clasificación como las demás —tus partidas ordenadas por puntos— y
   la fecha ocupa la columna de quién, que es lo que distingue una
   fila de otra.                                                     */
export function localDays(span){
  const desde = spanDay(span);
  return DAILY.list()
    .filter(d => !desde || d.d >= desde)     // fechas ISO: comparar textos basta
    .map((d, i) => ({
      r: String(i+1).padStart(2,"0"),
      n: dayText(d.d),
      l: ptsText(d.pts),
      a: levelText(d.lv)
    }));
}

/* ── el mundo ─────────────────────────────────────────────────────
   En el reto diario la tabla mundial es la del día de hoy: la mejor
   partida de cada uno con las mismas figuras para todos. No hay
   temporada que sumar — los puntos son de la partida, y jugar más
   días no los aumenta.

   Si tu marca queda fuera de los cien primeros, se añade tu fila al
   final: una clasificación en la que no te encuentras no dice nada. */
/* Cada familia tiene un tramo que ya sabía servir y dos que no.

   El reto de hoy sale de `daily_board` y la tabla de siempre del
   juego libre, de `free_board`: son el periodo natural de cada una y
   no hay motivo para consultarlas de otra forma. Los otros dos van a
   las funciones nuevas, que se quedan con la mejor partida de cada
   jugador dentro del tramo. Ninguna suma nada: los puntos siguen
   siendo de una partida.                                            */
function pedirMundo(board, span, yo, tope){
  if (board === "daily"){
    if (span === "today"){ const d = dayKey(); return [worldDaily(d, tope), meDaily(yo, d)]; }
    const d = spanDay(span);
    return [worldDailySpan(d, tope), meDailySpan(yo, d)];
  }
  if (span === "all") return [worldFree(board, tope), meFree(yo, board)];
  const t = spanInstant(span);
  return [worldFreeSpan(board, t, tope), meFreeSpan(yo, board, t)];
}

export async function worldRows(board, span){
  const yo = ME.id();
  const [lista, mio] = await Promise.all(pedirMundo(board, span, yo, TOPE));

  if (!Array.isArray(lista)) return { rows: [], nota: NET.vivo ? T("notSent") : T("noNet") };

  /* las dos tablas devuelven lo mismo —puntos y nivel— así que se
     pintan igual: una sola forma de fila y ninguna excepción       */
  const fila = r => ({ r: String(r.pos), n: r.name, l: ptsText(r.points),
                       a: levelText(r.level), me: r.player_id === yo });

  const rows = lista.map(fila);
  if (!rows.length) return { rows: [], nota: notaVacia(span, "span") || T("worldEmpty") };

  /* ¿estás en la lista? Si no, tu puesto va al final */
  const yoDentro = rows.some(r => r.me);
  const m = Array.isArray(mio) ? mio[0] : null;
  if (!yoDentro && m)
    rows.push({ r: String(m.pos), n: DB.name() || "—", l: ptsText(m.points),
                a: levelText(m.level), me: true });

  return { rows, nota: m ? T("rankOf")(m.pos, m.total) : "" };
}

/* ── qué puesto ocuparía esta partida ─────────────────────────────
   Antes de subirla, para poder decidir con el número delante.

   Se cuenta aquí, con la tabla del mundo en la mano, y no se le
   pregunta al servidor: haría falta una función nueva para algo que
   sólo es contar cuántos van por delante de una cifra. Ahora todas
   las tablas ordenan igual —por puntos— así que la cuenta es una, y
   los empates los gana quien llegó antes, que nunca es una partida
   que se acaba de terminar.

   Esto no sigue al selector de tramo de la pantalla de marcas, y es
   a propósito: aquel filtra lo que se está mirando, pero una partida
   se sube a la clasificación de siempre, que es donde se compite.
   Decir «quedarías 3.º» contando sólo hoy sería mentir.

   Si tu marca de esa tabla ya era mejor, subir ésta no te mueve: el
   servidor se queda con la mejor de las dos. Entonces se dice que
   seguirías donde estás, que es la verdad y evita la sorpresa.      */
export function porDelante(lista, yo, sc){
  /* tu propia fila no cuenta: la partida la sustituye, no se suma */
  return lista.filter(r => r.player_id !== yo && Number(r.points) >= sc.pts).length;
}

export async function puestoProyectado(board, sc){
  const yo = ME.id(), dia = dayKey();

  const [lista, mio] = board === "daily"
    ? await Promise.all([worldDaily(dia, TOPE), meDaily(yo, dia)])
    : await Promise.all([worldFree(board, TOPE), meFree(yo, board)]);
  if (!Array.isArray(lista)) return null;

  const m = Array.isArray(mio) ? mio[0] : null;
  if (m && sc.pts <= Number(m.points))
    return { pos: Number(m.pos), total: Number(m.total), mejora: false };

  const delante = porDelante(lista, yo, sc);

  /* si cae más allá de lo que se ha traído, no hay con qué contar */
  if (delante >= lista.length && lista.length >= TOPE) return { fuera: TOPE };

  /* el total sólo se sabe si ya estabas dentro —te lo dice el propio
     servidor— o si la tabla entera cabía en lo que se ha traído     */
  return {
    pos: delante + 1,
    total: m ? Number(m.total) : (lista.length < TOPE ? lista.length + 1 : 0),
    mejora: true
  };
}

/* y cómo se cuenta eso en una línea */
export function textoPuesto(p){
  if (!p) return "";
  if (p.fuera) return T("wouldRankFar")(p.fuera);
  if (!p.total) return T("wouldRankOnly")(p.pos);
  return T(p.mejora ? "wouldRank" : "wouldKeep")(p.pos, p.total);
}

/* la tabla que se pinta al terminar una partida libre */
export function drawTable(el, max, mark, tl){
  drawRows(el, localRuns(freeBoard(tl), max, mark), "", cabecera("colName"));
}

/* La portada llevaba aquí tu mejor marca, junto al botón que abre las
   clasificaciones. Se ha quitado: la portada es para empezar a jugar,
   y la cifra ya está a un toque, dentro, donde además se puede
   comparar. Un dato que sólo se mira de pasada no vale una línea en
   la primera pantalla.                                              */
