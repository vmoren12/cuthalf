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
const fechaCorta = d => d.toLocaleDateString(lang, { day:"2-digit", month:"short" });
export const dayText = iso => {
  const [y, m, d] = String(iso).split("-").map(Number);
  return fechaCorta(new Date(y, m - 1, d));
};

/* Cuándo se jugó una partida, para la columna en la que la tabla del
   mundo pone el nombre.

   Ahí, en tu propia tabla, el nombre era el tuyo cien veces seguidas:
   no distinguía una fila de otra, que es justo lo que esa columna
   tiene que hacer. El reto diario ya lo había resuelto poniendo la
   fecha, y aquí vale el mismo razonamiento — sólo que una tarde da
   para varias partidas y la fecha sola las volvería a igualar. Por
   eso las de hoy llevan la hora: pasado el día, lo que se recuerda
   es qué día fue, no que fueran las siete y media.

   Las marcas de versiones que no apuntaban la hora se quedan sin
   nada que decir, y lo dicen.                                       */
export const runWhen = ts => {
  if (!Number.isFinite(ts) || ts <= 0) return "—";
  const d = new Date(ts), hoy = new Date();
  const mismoDia = d.getFullYear() === hoy.getFullYear()
                && d.getMonth()    === hoy.getMonth()
                && d.getDate()     === hoy.getDate();
  return mismoDia ? d.toLocaleTimeString(lang, { hour:"2-digit", minute:"2-digit" })
                  : fechaCorta(d);
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
      n: runWhen(r.ts),
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

  /* ¿estás en la lista? Si no, tu puesto va al final.

     Tu nombre ahí sale del aparato porque `free_me` y `daily_me`
     devuelven puesto y puntos, no nombre — y pedirlo obligaría a
     tocarlas para repetir el dato que ya tienes en la mano. Los dos
     coinciden: renombrarse avisa al servidor al momento
     (`renameMe()`). Si aquella llamada no llegó, durante un rato te
     verás con el nombre nuevo aquí y con el viejo en las filas de
     arriba; es justo lo que pasa, y se avisa al cambiarlo.          */
  const yoDentro = rows.some(r => r.me);
  const m = Array.isArray(mio) ? mio[0] : null;
  if (!yoDentro && m)
    rows.push({ r: String(m.pos), n: DB.name() || "—", l: ptsText(m.points),
                a: levelText(m.level), me: true });

  return { rows, nota: m ? T("rankOf")(m.pos, m.total) : "" };
}

/* ── qué puesto ocuparía esta partida, y si vale la pena subirla ───
   Antes de subirla, para poder decidir con el número delante — y
   para no ofrecer siquiera lo que no cambiaría nada.

   El puesto se cuenta aquí, con la tabla del mundo en la mano, y no
   se le pregunta al servidor: haría falta una función nueva para algo
   que sólo es contar cuántos van por delante de una cifra. Todas las
   tablas ordenan igual —por puntos— así que la cuenta es una, y los
   empates los gana quien llegó antes, que nunca es una partida que
   se acaba de terminar.

   El puesto que se enseña es el de la tabla donde se compite: el reto
   de hoy, o la de siempre en juego libre. No sigue al selector de
   tramo de la pantalla de marcas — aquel filtra lo que se mira, no
   dónde se compite, y decir «quedarías 3.º» contando sólo hoy sería
   mentir.

   Pero la pregunta de si merece subirla es otra, y se responde con
   otro dato: **tu mejor marca subida hoy**. En el reto las dos
   preguntas coinciden, porque su clasificación es el día. En juego
   libre no: los tramos «hoy» y «mes» de la pantalla de marcas salen
   del histórico de partidas subidas (`free_span`), así que tu mejor
   partida de hoy tiene una fila propia que mover aunque tu récord de
   siempre, el de julio, siga siendo mayor. Comparar sólo contra la
   tabla de siempre dejaría fuera del histórico justo las partidas que
   esos dos tramos necesitan.

   Y sólo se descarta con el dato en la mano. Si la consulta del día
   no llegó, se ofrece: esconder el botón por una respuesta que no
   vino sería perder la marca por un túnel.                          */
export function porDelante(lista, yo, sc){
  /* tu propia fila no cuenta: la partida la sustituye, no se suma */
  return lista.filter(r => r.player_id !== yo && Number(r.points) >= sc.pts).length;
}

/* Lo que se espera al mundo antes de dar la pantalla de fin por
   pintada. No es un dato de la partida —es una consulta para decidir
   qué enseñar— y hay alguien delante mirando: si no contesta en este
   rato se sigue sin saber, y sin saber se ofrece subir. Sin este
   corte, una red colgada dejaría la pantalla sin botón hasta que
   venciera el plazo de `pedir()`, nueve segundos más allá.          */
const PLAZO = 2500;
const aTiempo = p => Promise.race([p, new Promise(r => setTimeout(() => r(null), PLAZO))]);

export async function puestoProyectado(board, sc){
  const yo = ME.id(), dia = dayKey(), esReto = board === "daily";

  const [lista, mio, delDia] = await Promise.all((esReto
    ? [worldDaily(dia, TOPE), meDaily(yo, dia), null]
    : [worldFree(board, TOPE), meFree(yo, board), meFreeSpan(yo, board, startOfToday())]
  ).map(aTiempo));
  if (!Array.isArray(lista)) return null;

  const m   = Array.isArray(mio)    ? mio[0]    : null;
  const hoy = Array.isArray(delDia) ? delDia[0] : null;

  /* ¿te mueve de sitio en la tabla donde compites? */
  const mejora = !m || sc.pts > Number(m.points);

  /* ¿mueve alguna fila que se pueda mirar? En el reto es la misma
     pregunta; en juego libre basta con ser tu mejor de hoy.        */
  const sube = esReto ? mejora
    : mejora || !Array.isArray(delDia) || !hoy || sc.pts > Number(hoy.points);

  if (!mejora)
    return { pos: Number(m.pos), total: Number(m.total), mejora: false, sube };

  const delante = porDelante(lista, yo, sc);

  /* si cae más allá de lo que se ha traído, no hay con qué contar */
  if (delante >= lista.length && lista.length >= TOPE) return { fuera: TOPE, sube: true };

  /* el total sólo se sabe si ya estabas dentro —te lo dice el propio
     servidor— o si la tabla entera cabía en lo que se ha traído     */
  return {
    pos: delante + 1,
    total: m ? Number(m.total) : (lista.length < TOPE ? lista.length + 1 : 0),
    mejora: true,
    sube: true
  };
}

/* y cómo se cuenta eso en una línea. Tres cosas distintas que decir:
   dónde quedarías, que esta partida es tu mejor de hoy aunque no
   mueva la de siempre, o que no mueve nada — y en ese último caso la
   línea se queda sola, porque el botón ya no está.                  */
export function textoPuesto(p){
  if (!p) return "";
  if (p.fuera) return T("wouldRankFar")(p.fuera);
  if (!p.total) return T("wouldRankOnly")(p.pos);
  if (p.mejora) return T("wouldRank")(p.pos, p.total);
  return T(p.sube ? "wouldDay" : "wouldKeep")(p.pos, p.total);
}

/* la tabla que se pinta al terminar una partida libre */
export function drawTable(el, max, mark, tl){
  drawRows(el, localRuns(freeBoard(tl), max, mark), "", cabecera("colWhen"));
}

/* La portada llevaba aquí tu mejor marca, junto al botón que abre las
   clasificaciones. Se ha quitado: la portada es para empezar a jugar,
   y la cifra ya está a un toque, dentro, donde además se puede
   comparar. Un dato que sólo se mira de pasada no vale una línea en
   la primera pantalla.                                              */
