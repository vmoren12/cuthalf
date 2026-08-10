/* Datos locales · marcas históricas, reto diario y preferencias.

   Todo lo que hay aquí es tuyo y de este aparato. Lo que se compara
   con el resto del mundo vive en leaderboard.js, y nunca depende de
   esto: sin conexión el juego sigue guardando y ordenando igual.    */

import { CONFIG } from "./config.js";
import { dayKey } from "./util.js";
import { cmp, freeBoard, points, seasonOf } from "./scoring.js";

export const DB = (() => {
  const KEY = "half.v1";
  const ok = (() => { try { localStorage.setItem(KEY+".t","1"); localStorage.removeItem(KEY+".t"); return true; } catch(e){ return false; } })();
  const empty = () => ({ records: [], name: "", v: 2 });
  let mem = empty();

  /* Las marcas antiguas no sabían con qué reloj se habían hecho. Se
     les pone el que había por defecto — sin límite — porque es lo
     que jugaba casi todo el mundo, y se avisa en la tabla.          */
  const migrate = d => {
    if (d.v === 2) return d;
    for (const r of d.records || []){ if (r.tl === undefined){ r.tl = 0; r.old = 1; } }
    if (d.daily && d.daily.d){
      d.days = d.days || {};
      d.days[d.daily.d] = { lv: d.daily.lv, av: d.daily.av, tries: d.daily.tries };
    }
    d.v = 2;
    return d;
  };

  const read = () => {
    if (!ok) return mem;
    try { return migrate(JSON.parse(localStorage.getItem(KEY)) || empty()); }
    catch(e){ return empty(); }
  };
  const write = d => { mem = d; if (ok) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch(e){} } };

  return {
    persistent: ok,
    /* sin tabla, todas las marcas; con tabla, sólo las de ese reloj */
    list(board){
      const all = (read().records || []).slice().sort(cmp);
      return board ? all.filter(r => freeBoard(r.tl) === board) : all;
    },
    name(){ return read().name || ""; },
    add(r){
      const d = read();
      d.records = (d.records || []).concat(r).sort(cmp);
      /* el recorte es por tabla: una racha en «sin límite» no puede
         borrar del historial las marcas de tres segundos           */
      const seen = {};
      d.records = d.records.filter(x => {
        const b = freeBoard(x.tl);
        return (seen[b] = (seen[b] || 0) + 1) <= CONFIG.keep;
      });
      d.name = r.n;
      write(d);
    },
    days(){ return read().days || {}; },
    setDay(key, day){
      const d = read();
      d.days = d.days || {};
      d.days[key] = day;
      /* el historial del reto no crece sin fin */
      const keys = Object.keys(d.days).sort();
      while (keys.length > CONFIG.keepDays) delete d.days[keys.shift()];
      write(d);
    },
    clear(){ const d = read(); write({ ...empty(), name: d.name, lang: d.lang, theme: d.theme, timer: d.timer }); },
    get(k, dflt){ const v = read()[k]; return v === undefined || v === null ? dflt : v; },
    set(k, v){ const d = read(); d[k] = v; write(d); }
  };
})();

/* Reto diario: una marca por día, la mejor de todos los intentos.
   La racha sube el primer día que juegas si ayer también jugaste.  */
export const DAILY = {
  today(){
    const d = DB.days()[dayKey()];
    return d ? { d: dayKey(), ...d } : { d: dayKey(), lv: 0, av: 0, tries: 0 };
  },
  streak(){ return DB.get("streak", { last:"", n:0 }); },
  open(){
    const st = DAILY.streak(), key = dayKey();
    if (st.last !== key){
      st.n = st.last === dayKey(-1) ? st.n + 1 : 1;
      st.last = key; DB.set("streak", st);
    }
    return st;
  },
  close(score){
    const cur = DAILY.today();
    cur.tries++;
    const better = score.lv > cur.lv || (score.lv === cur.lv && score.av > cur.av);
    if (better){ cur.lv = score.lv; cur.av = score.av; }
    DB.setDay(cur.d, { lv: cur.lv, av: cur.av, tries: cur.tries });
    return { cur, better };
  },
  /* Temporada: lo acumulado en el mes natural. Cuenta el mejor
     intento de cada día, que es lo que sube a la clasificación.    */
  season(month = seasonOf(dayKey())){
    const days = DB.days();
    const list = Object.keys(days)
      .filter(k => seasonOf(k) === month)
      .sort()
      .map(k => ({ d: k, ...days[k], pts: points(days[k].lv, days[k].av) }));
    return { month, days: list, played: list.length, pts: list.reduce((a, d) => a + d.pts, 0) };
  }
};

/* ¿entra esta marca en su tabla? */
export const qualifies = (lv, av, tl) => {
  const l = DB.list(freeBoard(tl));
  return l.length < CONFIG.keep || cmp({ lv, av, ts:0 }, l[l.length-1]) < 0;
};
