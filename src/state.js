/* Estado e interfaz · el estado de la partida, el lienzo y los
   pequeños refrescos de pantalla. */

import { CONFIG, TUTOR } from "./config.js";
import { T } from "./i18n.js";

export const $ = id => document.getElementById(id);
export const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
export let W = 0, H = 0;

export const S = {
  phase: "intro",            // intro · play · result · paused · over
  level: 1, lives: CONFIG.lives, slots: CONFIG.lives, streak: 0, cuts: [], score: null,
  points: 0,                 // los de la partida en curso, corte a corte
  shape: null, cfg: null, rot: 0, rotSpd: 0, maxR: 1,
  tf: null,                  // proyección del último fotograma
  seed: 0, startedAt: 0,     // con qué semilla y cuándo empezó la partida
  ticket: null, enviada: false,  // el vale del servidor y si ya se subió
  trace: [],                 // los cortes de la partida, para el servidor
  t0: 0, last: 0, aim: null, res: null, world: null, pause: null,
  arranque: null,            // qué llamada a start() manda ahora mismo
  timer: 0, runTimer: 0, limit: 0, lastShape: null, mode: "free",
  board: "daily",            // clasificación que se está mirando
  scope: "world",            // el mundo o sólo este aparato
  /* Desde cuándo se mira, y una por familia porque su periodo
     natural no es el mismo: el reto se abre en el día de hoy, que es
     de lo que va, y el juego libre en la tabla de siempre, que es
     donde se compite. Un solo ajuste compartido tendría que estropear
     una de las dos al abrir.                                        */
  periods: { daily: "today", free: "all" },
  step: 0, tutorGuide: false, tutorHelp: false, tutorPending: null,
  refBest: 0, recordShown: false,
  capDesc: { k:"swipe" }, numErr: null, numOk: false
};

export const COL = { ink:"#0F1211", signal:"#2438F5" };
export function refreshColors(){
  const cs = getComputedStyle(document.body);
  COL.ink    = cs.getPropertyValue("--ink").trim();
  COL.signal = cs.getPropertyValue("--signal").trim();
}
export const ink = () => COL.ink, signal = () => COL.signal;

export const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
/* negativo total durante 80 ms: el golpe, sin añadir un solo elemento */
export function flash(){
  if (reduceMotion) return;
  const r = document.documentElement;
  r.classList.add("flash"); refreshColors();
  setTimeout(() => {
    r.classList.add("snap"); r.classList.remove("flash"); refreshColors();
    requestAnimationFrame(() => requestAnimationFrame(() => r.classList.remove("snap")));
  }, 80);
}

/* la cifra que se está enseñando y el fotograma que la mueve: el
   marcador rueda, así que lo pintado y lo real no siempre coinciden */
let ptsVisible = 0, ptsRodando = 0;

export const UI = {
  level(){
    if (S.mode === "tutor"){
      $("lvl-label").textContent = T("practice");
      $("lvl").textContent = (S.step + 1) + "/" + TUTOR.length;
      return;
    }
    $("lvl").textContent = String(S.level).padStart(2,"0");
    $("lvl-label").textContent = T(S.mode === "daily" ? "daily" : "level");
  },
  /* Los puntos, en directo. Se ganan en cada corte, así que se ven
     mientras se juega y no sólo al final: es la única forma de que se
     entienda qué los sube. En la práctica no hay marcador.

     Y no saltan: ruedan desde la cifra anterior hasta la nueva en un
     tercio de segundo. Sin rótulo que diga «puntos», el movimiento es
     lo que distingue este número del nivel, que está quieto al lado —
     y de paso se ve pagar el corte. `ya` los pone de golpe: al
     empezar una partida no hay nada que contar desde donde se quedó
     la anterior.                                                     */
  points(ya){
    const el = $("pts");
    cancelAnimationFrame(ptsRodando);
    if (ya || reduceMotion || ptsVisible === S.points){
      ptsVisible = S.points;
      el.textContent = ptsVisible.toLocaleString();
      return;
    }
    const desde = ptsVisible, hasta = S.points, t0 = performance.now(), dura = 340;
    const paso = t => {
      const k = Math.min(1, (t - t0) / dura);
      ptsVisible = Math.round(desde + (hasta - desde) * (1 - (1-k)**3));
      el.textContent = ptsVisible.toLocaleString();
      if (k < 1) ptsRodando = requestAnimationFrame(paso);
    };
    ptsRodando = requestAnimationFrame(paso);
  },
  tip(text){
    const el = $("tip");
    el.textContent = text || "";
    el.hidden = !text;
    if (!text) return;
    el.classList.remove("on"); void el.offsetWidth; el.classList.add("on");
  },
  /* las ranuras crecen si se gana una vida y nunca se rehacen desde
     cero: así las transiciones de apagado y encendido se ven         */
  lives(){
    const box = $("lives");
    S.slots = Math.max(CONFIG.lives, S.lives, S.slots);
    while (box.children.length < S.slots){
      const t = document.createElement("i");
      t.className = "new"; box.appendChild(t);
      requestAnimationFrame(() => requestAnimationFrame(() => t.classList.remove("new")));
    }
    while (box.children.length > S.slots) box.lastChild.remove();
    [...box.children].forEach((el, i) => el.classList.toggle("off", i >= S.lives));
  },
  /* el pie dice qué ha pasado con el corte y, si ha puntuado, cuánto:
     el total de arriba sube solo, pero de dónde sale se ve aquí     */
  cap(desc){
    S.capDesc = desc;
    const el = $("cap");
    el.textContent = T(desc.k) + (desc.gain ? " · +" + desc.gain : "");
    el.classList.toggle("hit", !!desc.hit);
  },
  /* el elogio crece un punto por cada eslabón de la racha */
  hype(text, k, miss){
    const el = $("hype");
    el.textContent = text;
    el.style.setProperty("--k", k);
    el.classList.toggle("miss", !!miss);
    el.classList.remove("on"); void el.offsetWidth; el.classList.add("on");
  },
  /* El pie a cero y sin despedirse.

     `num(null)` sólo le quita el `on`, y eso es un desvanecido de
     180 ms — el que hace falta al pasar de un nivel al siguiente,
     donde el porcentaje que se va es el que acabas de leer. Al
     empezar una partida ese mismo desvanecido se ve como un destello
     del último corte de la partida anterior sobre una pantalla que
     acaba de abrirse. Sin texto no hay nada que desvanecer.        */
  numOff(){
    const n = $("num");
    S.numErr = null; S.numOk = false;
    n.textContent = ""; n.className = "num";
  },
  num(err, ok){
    const n = $("num");
    S.numErr = err; S.numOk = ok;
    if (err === null){ n.className = "num"; return; }
    n.innerHTML = err.toFixed(1) + "<small>" + T("err") + "</small>";
    n.className = "num on " + (ok ? "valid" : "void");
    $("live").textContent = T("read")(err.toFixed(1)) + " · " + T(ok ? "cutOk" : "cutFail");
  }
};
export function resize(){
  const r = stage.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
  W = r.width; H = r.height;
  cv.width = W*d; cv.height = H*d;
  ctx.setTransform(d,0,0,d,0,0);
}
new ResizeObserver(resize).observe(stage);
