/* Menú · idioma, tema e instalación. */

import { CONFIG } from "./config.js";
import { DAILY, DB } from "./storage.js";
import { $, S, UI, refreshColors } from "./state.js";
import { T, lang, setLang } from "./i18n.js";
import { drawBest, drawRows, localRuns, localSeason, worldRows } from "./scores.js";
import { finishTutor, goHome, guardarPartida, paintOver, saveMark, start, startTutor } from "./game.js";
import { shareCard, toast } from "./share.js";
import { BOARDS, boardTime } from "./scoring.js";
import { ME } from "./player.js";

/* Preguntar algo con la cara del juego, no con la del navegador.

   Con `valor` se convierte en una casilla de texto y devuelve lo
   escrito, o null si se cancela. Sin él, devuelve sí o no.          */
export let askResolve = null;
let askConTexto = false;
export function ask(question, yesLabel, valor){
  askConTexto = valor !== undefined;
  $("ask-q").textContent = question;
  $("ask-yes").textContent = yesLabel;
  $("ask-no").textContent = T("cancel");
  $("ask-entry").hidden = !askConTexto;
  if (askConTexto){
    $("ask-input").value = valor || "";
    $("ask-input").placeholder = T("yourName");
  }
  $("scr-ask").hidden = false;
  if (askConTexto) requestAnimationFrame(() => { $("ask-input").focus(); $("ask-input").select(); });
  return new Promise(r => { askResolve = r; });
}
export function closeAsk(v){
  $("scr-ask").hidden = true;
  const texto = askConTexto ? $("ask-input").value : null;
  if (askResolve){
    const r = askResolve; askResolve = null;
    r(askConTexto ? (v ? texto : null) : v);
  }
}

/* selector de idioma: ES · EN, el activo marcado */
export function drawLangs(){
  const box = $("lang-intro");
  box.innerHTML = "";
  for (const code of ["es", "en"]){
    const b = document.createElement("button");
    b.textContent = code.toUpperCase();
    b.className = code === lang ? "on" : "";
    b.setAttribute("aria-label", code === "es" ? "Español" : "English");
    b.addEventListener("click", () => { if (code !== lang) applyLang(code); });
    box.appendChild(b);
  }
}

/* selector de tiempo: sólo en la portada */
export function drawTimers(){
  const box = $("seg-intro");
  box.innerHTML = "";
  for (const v of CONFIG.timers){
    const b = document.createElement("button");
    b.textContent = v ? String(v) : "∞";
    b.className = v === S.timer ? "on" : "";
    b.setAttribute("aria-label", v ? v + " s" : T("noLimit"));
    b.addEventListener("click", () => { S.timer = v; DB.set("timer", v); drawTimers(); });
    box.appendChild(b);
  }
}

/* ── clasificaciones ──────────────────────────────────────────────
   Cinco tablas: el reto diario, que se acumula por temporadas, y una
   por cada regla de tiempo del juego libre.                         */
export function drawBoards(){
  const box = $("seg-board");
  box.innerHTML = "";
  for (const b of BOARDS){
    const t = boardTime(b);
    const btn = document.createElement("button");
    btn.textContent = b === "daily" ? T("dailyShort") : (t ? String(t) : "∞");
    btn.className = b === S.board ? "on" : "";
    btn.setAttribute("aria-label", b === "daily" ? T("daily") : (t ? t + " s" : T("noLimit")));
    btn.addEventListener("click", () => { S.board = b; DB.set("board", b); drawBoards(); paintScores(); });
    box.appendChild(btn);
  }
}

/* Mundo o este aparato. Se abre en el mundo, que es de lo que va
   esto; lo de casa queda a un toque.                                */
export function drawScope(){
  const box = $("seg-scope");
  box.innerHTML = "";
  for (const s of ["world", "mine"]){
    const b = document.createElement("button");
    b.textContent = T(s === "world" ? "worldTab" : "mineTab");
    b.className = s === S.scope ? "on" : "";
    b.addEventListener("click", () => { S.scope = s; DB.set("scope", s); drawScope(); paintScores(); });
    box.appendChild(b);
  }
  /* Mientras no haya nombre no hay nada que enseñar: se pide al
     terminar la primera partida, y hasta entonces no se ha subido
     ninguna marca.                                                  */
  $("me-row").hidden = !ME.tieneNombre();
  $("me-name").textContent = DB.name();
}

/* la temporada en curso o el día de hoy, según la tabla */
const cabeceraLocal = () => {
  const s = DAILY.season();
  $("sea-pts").textContent    = s.pts.toLocaleString();
  $("sea-days").textContent   = String(s.played);
  $("sea-streak").textContent = DAILY.streak().n + " " + T("days");
};

export async function paintScores(){
  const daily = S.board === "daily";
  $("season-box").hidden = !daily;
  if (daily) cabeceraLocal();

  if (S.scope === "mine"){
    if (daily){ drawRows($("tbl-all"), localSeason()); return; }
    /* las marcas de antes no sabían con qué reloj se hicieron y están
       todas aquí: mejor decirlo que dejar que cuadre mal            */
    const old = S.board === "free-0" && DB.list("free-0").some(r => r.old);
    drawRows($("tbl-all"), localRuns(S.board, CONFIG.keep), old ? T("oldNote") : "");
    return;
  }

  /* el mundo hay que ir a buscarlo, así que primero se dice que se
     está yendo: una tabla vacía sin explicación parece un error    */
  drawRows($("tbl-all"), [], T("loading"));
  const marca = ++peticion;
  const filas = await worldRows(S.board);
  if (marca !== peticion) return;          // llegó tarde: manda la última
  drawRows($("tbl-all"), filas.rows, filas.nota);
}

/* para no pisarse cuando se cambia de pestaña más rápido de lo que
   contesta el servidor                                              */
let peticion = 0;

export function openScores(){
  drawBoards(); drawScope(); paintScores();
  $("scr-scores").hidden = false;
}

/* El nombre se puede cambiar cuando se quiera: la próxima partida que
   suba lo lleva, y el servidor actualiza el de todas tus marcas —eres
   el mismo jugador, sólo que con otro nombre.                       */
export async function renameMe(){
  const actual = DB.name();
  const nuevo = await ask(T("askName"), T("save"), actual);
  if (nuevo === null) return;
  const limpio = nuevo.replace(/\s+/g, " ").trim().slice(0, CONFIG.nameMax);
  if (!limpio || limpio === actual) return;
  DB.set("name", limpio);
  drawBest(); drawScope(); paintScores();
  toast(T("saved"));
}


/* congelar y descongelar la partida. El reloj de la figura se mide
   contra S.t0, así que al reanudar se le suma lo que ha durado la
   interrupción: preguntar «¿abandonas?» no puede costar segundos.  */
export function pauseRun(){
  if (S.phase !== "play" && S.phase !== "result") return false;
  S.pause = { phase: S.phase, at: performance.now() };
  S.phase = "paused";
  return true;
}
export function resumeRun(){
  if (!S.pause) return;
  const d = performance.now() - S.pause.at;
  S.t0 += d; S.last = performance.now();
  if (S.res) S.res.t0 += d;
  S.phase = S.pause.phase; S.pause = null;
}

/* abandonar: se pregunta con la partida detenida y, si se dice que
   no, se sigue donde estaba. Devuelve si se ha salido de verdad.   */
export async function quitRun(){
  const mine = pauseRun();
  if (!await ask(T("quitAsk"), T("quitNow"))){
    if (mine) resumeRun();
    return false;
  }
  S.pause = null; S.res = null;
  goHome();
  return true;
}

export function applyLang(next){
  setLang(next); DB.set("lang", next);
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-t]").forEach(el => { el.textContent = T(el.dataset.t); });
  document.querySelectorAll("[data-tp]").forEach(el => { el.placeholder = T(el.dataset.tp); });
  document.querySelectorAll("[data-ta]").forEach(el => { el.setAttribute("aria-label", T(el.dataset.ta)); });
  drawLangs();
  UI.cap(S.capDesc); UI.level();
  if (S.numErr !== null) UI.num(S.numErr, S.numOk);
  drawBest(); drawTimers(); paintOver();
  if (!$("scr-scores").hidden){ drawBoards(); paintScores(); }
  syncTheme(); syncInstall();
}

export const mq = matchMedia("(prefers-color-scheme: dark)");
export const isDark = () => document.documentElement.dataset.theme === "dark";
export function setTheme(d, remember){
  document.documentElement.dataset.theme = d ? "dark" : "light";
  document.querySelector("meta[name=theme-color]").content = d ? "#0F1211" : "#DFE1DA";
  if (remember) DB.set("theme", d ? "dark" : "light");
  refreshColors(); syncTheme();
}
export function syncTheme(){
  const t = T("theme") + " · " + T(isDark() ? "light" : "dark");
  $("theme-intro").setAttribute("aria-label", t);
}

export let deferred = null;
export const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; syncInstall(); });
addEventListener("appinstalled", () => { deferred = null; syncInstall(); });
export function syncInstall(){
  const i = $("install-intro"), h = $("install-hint");
  i.hidden = !deferred || standalone();
  /* en iPhone el navegador nunca ofrece el aviso de instalación, así
     que el botón no puede aparecer: ahí es donde hace falta explicar
     el camino a mano. En el resto, o sale el botón o no hay nada que
     decir.                                                          */
  h.textContent = (!deferred && !standalone() && isIOS()) ? T("hintIOS") : "";
  h.hidden = !h.textContent;
}
export async function promptInstall(){
  if (!deferred) return;
  deferred.prompt(); await deferred.userChoice; deferred = null; syncInstall();
}

$("close-run").addEventListener("click", quitRun);
$("open-scores").addEventListener("click", openScores);
$("scores-close").addEventListener("click", () => { $("scr-scores").hidden = true; });
$("rename").addEventListener("click", renameMe);
$("theme-intro").addEventListener("click", () => setTheme(!isDark(), true));
$("install-intro").addEventListener("click", promptInstall);
$("ask-yes").addEventListener("click", () => closeAsk(true));
$("ask-no").addEventListener("click", () => closeAsk(false));
$("ask-input").addEventListener("keydown", e => { if (e.key === "Enter") closeAsk(true); });
$("go").addEventListener("click", () => start("free"));
$("go-daily").addEventListener("click", () => start("daily"));
$("go-tutor").addEventListener("click", () => startTutor(null));
$("tutor-skip").addEventListener("click", () => finishTutor(false));
$("again").addEventListener("click", () => start(S.mode));
$("home").addEventListener("click", goHome);
$("share").addEventListener("click", shareCard);
$("save").addEventListener("click", saveMark);
$("name").addEventListener("keydown", e => { if (e.key === "Enter") saveMark(); });
$("keep-up").addEventListener("click", () => guardarPartida("mundo"));
$("keep-here").addEventListener("click", () => guardarPartida("aparato"));
$("keep-no").addEventListener("click", () => guardarPartida("nada"));
addEventListener("keydown", e => {
  /* lo que se atienda aquí se marca como consumido: si no, CloseWatcher
     recogería el mismo Escape y lo volvería a atender por su cuenta   */
  if (e.key === "Escape"){
    if (!$("scr-ask").hidden) closeAsk(false);
    else if (!$("scr-scores").hidden) $("scr-scores").hidden = true;
    else if (S.mode === "tutor" && S.phase !== "intro") finishTutor(false);
    else return;                      // sin overlay: que lo recoja quien toque
    e.preventDefault();
    return;
  }
  if (e.key === "Enter" && S.phase === "intro") start();
});

/* ── Gesto de atrás ───────────────────────────────────────────────
   En Android, con la app instalada, «atrás» cerraría la aplicación en
   mitad de una partida. Mientras se juega se atiende ese gesto y se
   responde como al botón de cerrar.

   Por qué CloseWatcher y no el historial: retener el gesto con una
   entrada de historial funciona, pero el sistema ve entonces una
   navegación de verdad y la anima — deslizando la pantalla al arrastrar
   desde el borde izquierdo, que es el borde de «atrás» (por el derecho
   no pasa nada porque no hay entrada hacia adelante). CloseWatcher
   recoge la misma petición de cierre sin tocar el historial: no hay
   navegación que animar, así que no hay deslizamiento.

   El historial queda de plan B para navegadores que aún no lo traen.
   Ahí retirar la entrada no es inmediato — el popstate de
   history.back() llega más tarde —, y si entretanto se empieza otra
   partida el rearme adelantaría al viaje en vuelo; por eso se aplaza
   con backWanted hasta que ese viaje aterriza.                      */
export let closeWatch = null;
export let backArmed = false, backFlight = 0, backWanted = false;

export function armBack(){
  if (closeWatch) return;
  if (window.CloseWatcher){
    try {
      const w = new CloseWatcher();
      w.addEventListener("close", () => {
        if (closeWatch === w) closeWatch = null;
        handleBack();
      });
      closeWatch = w;
      return;
    } catch(e){ closeWatch = null; }         // sin cupo: se sigue por historial
  }
  backWanted = true;
  if (backArmed || backFlight > 0) return;   // ya puesta, o se pondrá al aterrizar
  try { history.pushState({ half:"run" }, ""); backArmed = true; } catch(e){}
}
export function disarmBack(){
  if (closeWatch){
    const w = closeWatch; closeWatch = null;
    try { w.destroy(); } catch(e){}          // destroy() no dispara «close»
    return;
  }
  backWanted = false;
  if (!backArmed) return;
  backArmed = false; backFlight++;
  try { history.back(); } catch(e){ backFlight--; }
}

addEventListener("popstate", () => {
  if (backFlight > 0){                         // retroceso provocado por disarmBack
    backFlight--;
    if (backWanted){ backWanted = false; armBack(); }
    return;
  }
  if (!backArmed) return;                      // la entrada no era nuestra
  backArmed = false;
  handleBack();
});

export function handleBack(){
  /* se repone antes de actuar: si el gesto acaba en «cancelar», el
     siguiente atrás tiene que seguir encontrando la trampa puesta   */
  armBack();
  if (!$("scr-ask").hidden){ closeAsk(false); return; }
  if (!$("scr-scores").hidden){ $("scr-scores").hidden = true; return; }
  if (S.mode === "tutor"){ finishTutor(false); return; }
  if (S.phase === "play" || S.phase === "result" || S.pause){ quitRun(); return; }
  goHome();                                    // p. ej. desde el final de partida
}
