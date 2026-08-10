/* Ciclo de juego. */

import { CONFIG, TUTOR, levelConfig } from "./config.js";
import { DAILY, DB, qualifies } from "./storage.js";
import { RNG, TAU, mulberry32, pick, setRNG } from "./rng.js";
import { $, S, UI, flash } from "./state.js";
import { SHAPES } from "./shapes.js";
import { T } from "./i18n.js";
import { applyUpdate, pendingReload, swReg } from "./pwa.js";
import { armBack, disarmBack } from "./menu.js";
import { clamp, dayKey, dayTimer, hashStr } from "./util.js";
import { drawBest, drawTable } from "./scores.js";
import { evaluate, normalize, partsCentroid } from "./geometry.js";
import { cmp, freeBoard } from "./scoring.js";
import { toast } from "./share.js";

export function newLevel(){
  const cfg = levelConfig(S.level);
  S.cfg    = cfg;
  /* nunca la misma figura dos veces seguidas */
  let pool = cfg.shapes;
  if (pool.length > 1 && S.lastShape){
    const f = pool.filter(x => x !== S.lastShape);
    if (f.length) pool = f;
  }
  const name = pick(pool);
  S.lastShape = name;
  S.limit  = S.runTimer;
  S.shape  = normalize(SHAPES[name]());
  S.maxR   = Math.max(...S.shape.flat().map(v => Math.hypot(v.x, v.y)));
  S.rot    = RNG() * TAU;
  S.rotSpd = cfg.rot * (RNG() < .5 ? -1 : 1);
  S.t0     = performance.now();
  S.last   = S.t0;
  S.aim = null; S.res = null; S.phase = "play";
  UI.level(); UI.num(null); UI.cap({ k: cfg.ghost ? "ghost" : "swipe" });
}

/* ── práctica guiada ──────────────────────────────────────────────
   Vive dentro del mismo motor: misma figura, mismo trazo, misma
   medida. Lo único que cambia es que aquí no se pierde nada — se
   repite el paso hasta que sale — y que se puede salir en cualquier
   momento con «Saltar».                                            */
export function tutorStep(){
  const st = TUTOR[S.step];
  S.cfg    = { shapes:[st.shape], rot: st.rot || 0, drift: 0, outline: false, ghost: 0 };
  S.shape  = normalize(SHAPES[st.shape]());
  S.maxR   = Math.max(...S.shape.flat().map(v => Math.hypot(v.x, v.y)));
  S.rot    = st.rot ? Math.random() * TAU : 0;
  S.rotSpd = st.rot ? st.rot * (Math.random() < .5 ? -1 : 1) : 0;
  S.limit  = 0;
  S.t0     = performance.now();
  S.last   = S.t0;
  S.aim = null; S.res = null; S.phase = "play";
  S.tutorGuide = !!st.guide || S.tutorHelp;
  /* si se viene de un fallo manda el consejo correctivo: el del paso
     ya se ha leído, y en el 3 y el 4 diría «sin línea» con la línea
     puesta                                                          */
  UI.level(); UI.num(null); UI.cap({ k:"swipe" });
  UI.tip(T(S.tutorHelp ? "tutRetry" : st.tip));
}

export function startTutor(pending){
  S.mode = "tutor"; S.tutorPending = pending || null;
  S.step = 0; S.tutorHelp = false;
  setRNG(Math.random);
  S.runTimer = 0; S.recordShown = false; S.refBest = 0;
  S.level = 1; S.streak = 0; S.cuts = []; S.score = null; S.pause = null;
  $("scr-intro").hidden = true; $("scr-over").hidden = true;
  $("hype").classList.remove("on");
  armBack();
  tutorChrome(true);
  tutorStep();
}

/* se llega aquí por las dos puertas: terminando el último paso o
   saltando. En ambos casos no se vuelve a ofrecer solo.            */
export function finishTutor(completed){
  DB.set("tutorDone", true);
  tutorChrome(false);
  const pending = S.tutorPending;
  S.tutorPending = null; S.res = null; S.aim = null;
  S.phase = "intro"; S.mode = "free";
  if (pending){ start(pending); return; }
  goHome();
  if (completed) toast(T("tutorDone"));
}

export function tutorChrome(on){
  $("close-run").hidden = on;      // en la práctica manda «Saltar»
  $("tutor-skip").hidden = !on;
  $("lives").hidden = on;
  if (!on) UI.tip("");
}

export function doCut(a, b){
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
  if (len < CONFIG.minSwipe) return;
  const N = { x: -dy/len, y: dx/len };
  const r = evaluate(S.world, a, N);
  const ok = r.err < CONFIG.tolerance;
  S.res = Object.assign(r, { P:a, N, ok, t0: performance.now() });
  S.phase = "result";
  S.cuts.push(100 - r.err);
  UI.num(r.err, ok);

  const tut = S.mode === "tutor";

  if (ok){
    S.streak++;
    UI.cap({ k: "cutOk", hit: true });
    /* en la práctica no hay rachas ni récords que celebrar: sólo el
       elogio, para que el gesto de acertar se reconozca igual       */
    if (tut){
      UI.hype(T("praise")[Math.min(S.step, T("praise").length - 1)], 1);
      if (navigator.vibrate) navigator.vibrate(10);
    }
    /* el récord se bate en el momento de subir por encima de él */
    else if (!S.recordShown && S.refBest > 0 && S.level + 1 > S.refBest){
      S.recordShown = true;
      UI.hype(T("newRecord"), .8);
      if (navigator.vibrate) navigator.vibrate([10,40,10,40,20]);
      if (S.streak + 1 >= CONFIG.streak){ S.streak = 0; if (S.lives < CONFIG.maxLives){ S.lives++; UI.lives(); } }
      return;
    }
    else if (S.streak >= CONFIG.streak){
      S.streak = 0;
      const room = S.lives < CONFIG.maxLives;
      if (room){ S.lives++; UI.lives(); }
      UI.hype(T(room ? "bonus" : "full"), .58);
      if (navigator.vibrate) navigator.vibrate(room ? [12,50,12,50,12] : 10);
    } else {
      UI.hype(T("praise")[S.streak - 1], 1 + (S.streak - 1) * .05);
      if (navigator.vibrate) navigator.vibrate(10);
    }
  } else {
    S.streak = 0;
    UI.cap({ k: "cutFail" });
    /* Math.random y no pick(): el RNG del reto diario está sembrado y
       gastarlo aquí descuadraría la secuencia de figuras al fallar.  */
    const m = T("miss");
    UI.hype(m[Math.floor(Math.random() * m.length)], .62, true);
    if (navigator.vibrate) navigator.vibrate([16,40,16]);
  }

  if (!ok){
    /* la balanza se vence: pivote en el centro de masas, brazo
       horizontal del lado pesado, ángulo según la magnitud del error */
    const heavier = r.aA >= r.aB;
    const heavy = heavier ? r.A : r.B, light = heavier ? r.B : r.A;
    const pv = partsCentroid(S.world), ch = partsCentroid(heavy);
    let R = 1;
    for (const p of S.world) for (const v of p) R = Math.max(R, Math.hypot(v.x-pv.x, v.y-pv.y));
    Object.assign(S.res, {
      heavy, light, pv,
      k    : clamp(r.err / 40, 0, 1),
      lever: clamp((ch.x - pv.x) / (R * .55), -1, 1)
    });
    /* fallar en la práctica no cuesta nada: se repite el paso y, si
       la pista no estaba puesta, a partir de ahora sí                */
    if (tut){ S.tutorHelp = true; UI.tip(T("tutRetry")); }
    else { S.lives--; UI.lives(); }
    flash();
  }
}

export function timeUp(){
  S.aim = null;
  S.res = { ok:false, timeout:true, parts:S.world, t0: performance.now() };
  S.phase = "result";
  S.streak = 0; S.lives--;
  UI.lives(); UI.num(null); UI.cap({ k:"timeout" });
  flash();
  if (navigator.vibrate) navigator.vibrate([16,40,16]);
}

export function advance(){
  if (S.mode === "tutor"){
    if (!S.res.ok){ tutorStep(); return; }        // mismo paso otra vez
    S.step++; S.tutorHelp = false;
    if (S.step >= TUTOR.length) finishTutor(true);
    else tutorStep();
    return;
  }
  if (S.res.ok){ S.level++; newLevel(); }
  else if (S.lives <= 0) gameOver();
  else newLevel();
}

export function gameOver(){
  S.phase = "over";
  const avg  = S.cuts.length ? S.cuts.reduce((a,b)=>a+b,0)/S.cuts.length : 0;
  const best = S.cuts.length ? Math.max(...S.cuts) : 0;
  /* el reloj con el que se ha jugado va en la marca: una partida sin
     límite y otra de tres segundos por figura no son comparables   */
  S.score = { lv: S.level, av: +avg.toFixed(1), best: +best.toFixed(1), tl: S.runTimer, saved: false };
  if (S.mode === "daily"){
    const prev = DAILY.today(), r = DAILY.close(S.score);
    S.score.daily  = r.cur;
    S.score.record = r.better && prev.tries > 0;
  } else {
    const prev = DB.list(freeBoard(S.runTimer))[0];
    S.score.record = !!prev && cmp({ lv:S.score.lv, av:S.score.av, ts:0 }, prev) < 0;
  }
  paintOver();
  $("scr-over").hidden = false;
  if (pendingReload && swReg) swReg.update().catch(() => {});
}

export function paintOver(){
  if (!S.score) return;
  $("over-mark").textContent = S.score.lv > 1
    ? T("levelWord") + " " + String(S.score.lv).padStart(2,"0")
    : T("end");
  $("s-lvl").textContent  = String(S.score.lv).padStart(2,"0");
  $("s-avg").textContent  = S.score.av.toFixed(1) + "%";
  $("s-best").textContent = S.cuts.length ? S.score.best.toFixed(1) + "%" : "—";

  $("again").textContent = T(S.mode === "daily" ? "retry" : "again");
  $("rec-badge").hidden = !S.score.record;

  if (S.mode === "daily"){
    const d = S.score.daily, st = DAILY.streak();
    $("daily-over").hidden = false;
    $("entry").hidden = true; $("entry-note").hidden = true; $("tbl-over").hidden = true;
    $("d-try").textContent    = "#" + d.tries;
    $("d-best").textContent   = "N." + String(d.lv).padStart(2,"0") + " · " + d.av.toFixed(1) + "%";
    $("d-streak").textContent = st.n + " " + T("days");
    return;
  }
  $("daily-over").hidden = true; $("tbl-over").hidden = false;

  const q = !S.score.saved && qualifies(S.score.lv, S.score.av, S.score.tl);
  $("entry").hidden = !q;
  $("entry-note").hidden = q;
  if (q) $("name").value = $("name").value || DB.name();
  else if (S.score.saved) $("entry-note").textContent = DB.persistent ? T("saved") : T("savedSession");
  else $("entry-note").textContent = T("noTable");
  drawTable($("tbl-over"), S.score.saved ? 6 : 5, S.score.ts || null, S.score.tl);
}

export function saveMark(){
  if (!S.score || S.score.saved) return;   // una marca por partida
  const raw = $("name").value.replace(/\s+/g," ").trim().slice(0, CONFIG.nameMax);
  const n = raw || "—";
  const ts = Date.now();
  DB.add({ n, lv: S.score.lv, av: S.score.av, tl: S.score.tl, ts });
  S.score.saved = true; S.score.ts = ts;
  paintOver(); drawBest();
}

export function goHome(){
  $("scr-over").hidden = true; $("scr-intro").hidden = false;
  S.phase = "intro"; S.score = null; S.pause = null;
  disarmBack();                       // en la portada, atrás vuelve a salir
  $("hype").classList.remove("on");
  drawBest();
  if (pendingReload) applyUpdate();
}

export function start(mode){
  const want = mode === "daily" ? "daily" : "free";
  /* la primera vez se enseña antes de jugar, y al terminar (o al
     saltar) se entra en la partida que se había pedido             */
  if (!DB.get("tutorDone", false)){ startTutor(want); return; }
  S.mode = want;
  if (S.mode === "daily"){
    const key = dayKey();
    setRNG(mulberry32(hashStr(key)));   // misma secuencia para todos
    S.runTimer = dayTimer(key);
    DAILY.open();
    S.refBest = DAILY.today().lv;
  } else {
    setRNG(Math.random);
    S.runTimer = S.timer;
    S.refBest = (DB.list(freeBoard(S.runTimer))[0] || {}).lv || 0;
  }
  S.recordShown = false;
  S.level = 1; S.lives = CONFIG.lives; S.slots = CONFIG.lives; S.streak = 0;
  S.cuts = []; S.score = null; S.pause = null; S.lastShape = null;
  $("lives").innerHTML = "";
  $("name").value = "";
  $("scr-intro").hidden = true; $("scr-over").hidden = true;
  $("hype").classList.remove("on");
  armBack();
  UI.lives(); newLevel();
}
