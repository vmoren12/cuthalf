/* Ciclo de juego. */

import { CONFIG, TUTOR, levelConfig } from "./config.js";
import { DAILY, DB, qualifies } from "./storage.js";
import { RNG, TAU, mulberry32, pick, setRNG } from "./rng.js";
import { $, S, UI, flash, reduceMotion } from "./state.js";
import { SHAPES } from "./shapes.js";
import { T } from "./i18n.js";
import { applyUpdate, pendingReload, swReg } from "./pwa.js";
import { armBack, disarmBack } from "./menu.js";
import { clamp, dayKey, dayTimer, hashStr } from "./util.js";
import { drawTable, puestoProyectado, textoPuesto } from "./scores.js";
import { evaluate, normalize, partsCentroid } from "./geometry.js";
import { cmp, cutPoints, freeBoard } from "./scoring.js";
import { toShapeSpace, trim } from "./replay.js";
import { runStart } from "./net.js";
import { ME } from "./player.js";
import { ENVIO, enviarPartida, limpiarEnvio, repintarEnvio } from "./submit.js";
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
  S.level = 1; S.streak = 0; S.cuts = []; S.score = null; S.pause = null; S.points = 0;
  $("scr-intro").hidden = true; $("scr-over").hidden = true;
  $("hype").classList.remove("on");
  armBack();
  tutorChrome(true);
  UI.numOff();                    // sin destello del porcentaje anterior
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
  $("pts-box").hidden = on;        // en la práctica no se puntúa
  if (!on) UI.tip("");
}

export function doCut(a, b){
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
  if (len < CONFIG.minSwipe) return;
  const N = { x: -dy/len, y: dx/len };
  const r = evaluate(S.world, a, N);
  const ok = r.err < CONFIG.tolerance;
  const now = performance.now();
  /* lo que ha costado esta figura, redondeado una sola vez: con este
     mismo número se apunta el corte y se pagan sus puntos, así que el
     servidor repite las dos cuentas y le salen iguales              */
  const ms = Math.round(now - S.t0);
  S.res = Object.assign(r, { P:a, N, ok, t0: now });
  S.phase = "result";
  S.cuts.push(100 - r.err);
  UI.num(r.err, ok);

  const tut = S.mode === "tutor";

  /* el corte, apuntado como lo verá el servidor: en coordenadas de la
     figura, que es lo único que puede volver a medir por su cuenta  */
  if (!tut && S.tf){
    const m = toShapeSpace(S.tf, a, N);
    S.trace.push({
      P : { x: trim(m.P.x), y: trim(m.P.y) },
      N : { x: trim(m.N.x), y: trim(m.N.y) },
      ms
    });
  }

  /* los puntos del corte. Es donde se ganan todos: lo fino que ha
     salido, por lo deprisa que ha salido. En la práctica no se lleva
     cuenta — allí no se compite con nadie.                          */
  const gana = tut ? 0 : cutPoints(r.err, ms);
  if (gana){ S.points += gana; UI.points(); }

  if (ok){
    S.streak++;
    UI.cap({ k: "cutOk", hit: true, gain: gana });
    /* en la práctica no hay rachas ni récords que celebrar: sólo el
       elogio, para que el gesto de acertar se reconozca igual       */
    if (tut){
      UI.hype(T("praise")[Math.min(S.step, T("praise").length - 1)], 1);
      if (navigator.vibrate) navigator.vibrate(10);
    }
    /* El récord se bate al pasar por encima de él —ahora en puntos,
       que es lo que se compara— y manda sobre el aviso de racha: no
       caben dos rótulos a la vez. Pero sólo manda en lo que se dice,
       nunca en lo que pasa: las vidas y la racha siguen la misma
       regla para todos. Batir un récord es cosa de tu aparato, y el
       servidor, que no sabe de tus marcas, tiene que poder repetir la
       partida y llegar al mismo sitio.                              */
    else {
      const record = !S.recordShown && S.refBest > 0 && S.points > S.refBest;
      if (record) S.recordShown = true;

      if (S.streak >= CONFIG.streak){
        S.streak = 0;
        const room = S.lives < CONFIG.maxLives;
        if (room){ S.lives++; UI.lives(); }
        UI.hype(record ? T("newRecord") : T(room ? "bonus" : "full"), record ? .8 : .58);
        if (navigator.vibrate) navigator.vibrate(record ? [10,40,10,40,20] : (room ? [12,50,12,50,12] : 10));
      } else if (record){
        UI.hype(T("newRecord"), .8);
        if (navigator.vibrate) navigator.vibrate([10,40,10,40,20]);
      } else {
        UI.hype(T("praise")[S.streak - 1], 1 + (S.streak - 1) * .05);
        if (navigator.vibrate) navigator.vibrate(10);
      }
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
  if (S.mode !== "tutor") S.trace.push({ timeout: true, ms: Math.round(S.limit * 1000) });
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
  S.score = { lv: S.level, av: +avg.toFixed(1), best: +best.toFixed(1),
              pts: S.points, tl: S.runTimer, saved: false };
  if (S.mode === "daily"){
    const prev = DAILY.today(), r = DAILY.close(S.score);
    S.score.daily  = r.cur;
    S.score.record = r.better && prev.tries > 0;
  } else {
    const prev = DB.list(freeBoard(S.runTimer))[0];
    S.score.record = !!prev && cmp({ pts:S.score.pts, ts:0 }, prev) < 0;
  }
  /* el nombre viene puesto: casi siempre es el de siempre, y quien
     quiera cambiarlo lo tiene delante sin buscarlo                 */
  $("name").value = DB.name();
  paintOver();
  $("scr-over").hidden = false;
  if (pendingReload && swReg) swReg.update().catch(() => {});
}

export function paintOver(){
  if (!S.score) return;
  $("over-mark").textContent = S.score.lv > 1
    ? T("levelWord") + " " + String(S.score.lv).padStart(2,"0")
    : T("end");
  /* los puntos de la partida, arriba del todo y en las dos formas de
     juego: son el resultado, y son sólo de esta partida             */
  $("s-pts").textContent  = S.score.pts.toLocaleString();
  $("s-avg").textContent  = S.score.av.toFixed(1) + "%";

  $("again").textContent = T(S.mode === "daily" ? "retry" : "again");
  $("rec-badge").hidden = !S.score.record;

  /* La casilla del nombre ya no aparece sólo la primera vez: viene
     rellena con el de siempre y está donde hace falta, justo encima
     del botón de subir, porque es el nombre con el que se sube.    */
  const primeraVez = !ME.tieneNombre();
  $("save").textContent = T(primeraVez ? "save" : "rename");

  if (S.mode === "daily"){
    const d = S.score.daily;
    $("daily-over").hidden = false;
    $("tbl-over").hidden = true;
    /* el mejor intento de hoy, que es el que va a la clasificación
       del día: la partida que acaba de terminar puede no serlo     */
    $("d-best").textContent = d.pts.toLocaleString() + " · N." + String(d.lv).padStart(2,"0");
  } else {
    $("daily-over").hidden = true; $("tbl-over").hidden = false;

    /* La marca es de casa: entra en su tabla sin preguntar, como
       siempre. Guardar en el propio aparato no le cuesta nada a nadie
       ni se ve desde fuera — lo que pide permiso es publicarla.     */
    if (!primeraVez && !S.score.saved && qualifies(S.score.pts, S.score.tl)) guardarMarca();
    drawTable($("tbl-over"), S.score.saved ? 6 : 5, S.score.ts || null, S.score.tl);
  }

  /* Subir es lo único que se hace delante de todo el mundo, así que es
     lo único que se pregunta, y con un botón que al pulsarlo se
     convierte en su resultado: el puesto mundial, ahí arriba. Irse sin
     tocarlo no rompe nada — la partida está guardada — y no subir es
     la salida prudente, que no hay que explicarle a nadie.

     Sin vale no hay nada que ofrecer: el servidor no puede comprobar
     una partida que no empezó él, así que en vez de un botón que sólo
     puede fallar se dice lo que pasa.                               */
  const conVale = !!S.ticket && S.trace.length > 0;
  const enMarcha = ENVIO.estado !== "" && ENVIO.estado !== "sin-red";
  const sc = S.score;

  /* Con el número delante, que decidir a ciegas no es decidir. Se
     pregunta una sola vez por partida —`proy` deja de ser undefined en
     cuanto se pide— y se vuelve a pintar cuando conteste. Si para
     entonces ya se está en otra partida, no se toca nada.

     `pidiendo` es el estado que faltaba. Antes «todavía no sé» y «he
     preguntado y no me han contestado» eran el mismo valor —null— y
     como sin saber se ofrece, el botón asomaba en cuanto se abría la
     pantalla y desaparecía al llegar la respuesta. Ese parpadeo se
     veía. Ahora mientras se pregunta no hay botón, y aparece —o no—
     de una vez, junto a la línea del puesto, que llega con él.     */
  if (sc.proy === undefined && conVale){
    sc.proy = null; sc.pidiendo = true;
    puestoProyectado(S.mode === "daily" ? "daily" : freeBoard(sc.tl), sc)
      .then(p => { sc.proy = p; })
      .catch(() => {})
      .finally(() => { sc.pidiendo = false; if (S.score === sc) paintOver(); });
  }

  /* El bloque se queda también sin vale la primera vez: sin nombre no
     hay marca ni en casa, así que la casilla tiene que estar aunque no
     haya nada que subir. Lo que se va entonces es el botón.         */
  $("keep").hidden = (!conVale && !primeraVez) || enMarcha;
  /* Y el botón, además, sólo si subir mueve algo. Una partida que no
     mejora ninguna clasificación que el jugador pueda mirar no tiene
     nada que ofrecerle: pedirle que decida sobre eso es hacerle
     trabajar para nada. En su sitio queda la línea que dice por qué.

     `sube` vale false únicamente cuando se ha podido comprobar; con
     `proy` a null —la consulta no llegó— el botón se queda.         */
  $("keep-up").hidden = !conVale || sc.pidiendo || sc.proy?.sube === false;

  const texto = textoPuesto(sc.proy);
  $("rank-note").textContent = texto;
  $("rank-note").hidden = !texto;

  /* La nota de debajo: quién eres, o que esta partida no ha podido
     subir, o que no le ha dado para la tabla de casa. Mientras haya
     envío del que hablar la escribe él, y aquí no se toca.          */
  if (ENVIO.estado === ""){
    const nota = primeraVez ? T("askName")
      : !conVale ? T("offline")
      : S.mode !== "daily" && !S.score.saved ? T("noTable")
      : "";
    $("entry-note").textContent = nota;
    $("entry-note").hidden = !nota;
  }
  repintarEnvio();
}

/* El único paso que no se da solo: publicar la partida. Se espera al
   envío para volver a pintar, porque si se queda sin contestar el
   botón tiene que volver a estar ahí — un intento perdido por un túnel
   no puede costar la marca.                                          */
export async function subirPartida(){
  if (!S.score) return;
  /* Se sube con lo que ponga en la casilla, se haya pulsado «cambiar»
     o no: quien escribe un nombre y le da a subir espera subir con
     ése, no con el anterior. Vacía no hay a quién atribuir la marca. */
  const raw = $("name").value.replace(/\s+/g," ").trim().slice(0, CONFIG.nameMax);
  if (!raw){ $("name").focus(); return; }
  DB.set("name", raw);

  const envio = enviarPartida();   // deja el envío en marcha al momento
  paintOver();                     // y con eso el botón ya se ha retirado
  await envio;
  paintOver();                     // vuelve sólo si se quedó sin contestar
}

/* la marca en la tabla de este aparato */
function guardarMarca(){
  if (!S.score || S.score.saved) return;   // una marca por partida
  const ts = Date.now();
  DB.add({ n: DB.name() || "—", lv: S.score.lv, av: S.score.av, pts: S.score.pts, tl: S.score.tl, ts });
  S.score.saved = true; S.score.ts = ts;
}

/* El botón de la entrada de nombre. Sólo aparece la primera vez:
   guarda el nombre para siempre y, con él ya sabido, la marca entra en
   su tabla y aparece la oferta de subirla.                           */
export function saveMark(){
  if (!S.score) return;
  const raw = $("name").value.replace(/\s+/g," ").trim().slice(0, CONFIG.nameMax);
  DB.set("name", raw || "—");
  paintOver();
}

export function goHome(){
  limpiarEnvio();
  $("scr-over").hidden = true; $("scr-intro").hidden = false;
  $("count").hidden = true;           // si se sale contando, la cuenta se va con ello
  S.phase = "intro"; S.score = null; S.pause = null;
  disarmBack();                       // en la portada, atrás vuelve a salir
  $("hype").classList.remove("on");
  if (pendingReload) applyUpdate();
}

/* ── cuenta atrás ─────────────────────────────────────────────────
   Tres tarjetas partidas por la mitad antes de empezar. Da el tiempo
   de mirar la pantalla y de colocar el dedo, que en un juego que se
   decide en segundo y medio no es un adorno: sin ella la primera
   figura sale mientras todavía se está llegando.

   Y va a la vez que se pide el vale al servidor, así que la espera de
   red se gasta contando. Si el servidor tarda menos que esto —lo
   normal—, no se nota que se le haya esperado.

   El compás vive aquí y viaja al CSS en `--flip`, que es la única
   forma de que las dos mitades del efecto no discrepen. Las pruebas
   lo ponen a cero: allí sólo alargaría.

   Cada tarjeta se lleva `hold` quieta más `flip` girando, así que el
   segundo por cifra —los tres de la cuenta— es la suma de los dos y
   no sólo la espera. Con 340+300 la cuenta acababa en menos de dos
   segundos: parecía una cuenta atrás de tres y no lo era.

   `ya` es lo que se queda puesta la salida al acabar de contar, y va
   aparte de `hold` porque no cuenta nada: los tres segundos son los
   tres de las cifras. Corto a propósito — es el permiso para cortar,
   y quien lo lee ya está mirando.                                   */
export const CUENTA = { desde: 3, hold: 700, flip: 300, ya: 260 };

const espera = ms => new Promise(r => setTimeout(r, ms));

/* La palabra no cabe al cuerpo de una cifra: son cuatro signos donde
   había uno. El tamaño lo pone el CSS; aquí sólo se señala cuál de
   las cuatro mitades lleva palabra y cuál lleva número.             */
function poner(id, txt){
  const el = $(id);
  el.textContent = txt;
  el.classList.toggle("word", !/^\d*$/.test(txt));
}

/* de `de` a `a`: las mitades quietas enseñan ya la que viene y las
   que se mueven, la que se va. Tras el uno no viene un cero —viene
   la figura—, así que lo que descubre la última vuelta es el ¡YA!  */
function pintarCuenta(de, a){
  poner("count-top",  a);
  poner("count-rise", a);
  poner("count-bot",  de);
  poner("count-fold", de);
}

/* `marca` es la partida que la pidió. Si mientras cuenta empieza otra,
   la tarjeta pasa a ser de aquélla y ésta se retira sin recogerla:
   apagarla al terminar dejaría a oscuras la cuenta del vecino.     */
async function cuentaAtras(marca){
  const caja = $("count");
  if (!CUENTA.desde) return;
  caja.style.setProperty("--flip", CUENTA.flip + "ms");
  caja.hidden = false;
  for (let n = CUENTA.desde; n >= 1; n--){
    pintarCuenta(String(n), n > 1 ? String(n - 1) : T("go"));
    caja.classList.remove("turn");
    void caja.offsetWidth;             // para poder repetir la misma vuelta
    await espera(CUENTA.hold);
    if (S.arranque !== marca) return;
    /* sin movimiento las cifras se relevan y ya: quien pide menos
       animación no quiere una tarjeta girando en mitad de la pantalla */
    if (reduceMotion) continue;
    caja.classList.add("turn");
    await espera(CUENTA.flip);
    if (S.arranque !== marca) return;
  }
  /* La salida, entera y quieta un momento: descubrirla a mitad de
     giro es no enseñarla. Se pone en las cuatro mitades antes de
     quitar el giro porque al quitarlo las tarjetas vuelven a su
     sitio, y con el uno todavía puesto detrás eso sería un parpadeo.
     Es también lo que ve quien no quiere animaciones, que llega aquí
     sin haber girado ninguna.                                       */
  pintarCuenta(T("go"), T("go"));
  caja.classList.remove("turn");
  await espera(CUENTA.ya);
  if (S.arranque !== marca) return;
  caja.hidden = true;
}

/* `seed` sólo llega en el juego libre y sólo cuando la reparte el
   servidor, que es lo que impide sortear semillas hasta dar con una
   cómoda. Sin conexión se sortea aquí y la partida no sube a la
   clasificación mundial, pero se juega igual.                      */
export async function start(mode, seed){
  const want = mode === "daily" ? "daily" : "free";
  /* la primera vez se enseña antes de jugar, y al terminar (o al
     saltar) se entra en la partida que se había pedido             */
  if (!DB.get("tutorDone", false)){ startTutor(want); return; }
  S.mode = want;
  if (S.mode === "daily"){
    const key = dayKey();
    seed = hashStr(key);                // misma secuencia para todos
    S.runTimer = dayTimer(key);
    DAILY.open();
    S.refBest = DAILY.today().pts;
  } else {
    seed = (seed >>> 0) || (Math.random() * 2**32) >>> 0;
    S.runTimer = S.timer;
    S.refBest = (DB.list(freeBoard(S.runTimer))[0] || {}).pts || 0;
  }

  /* El vale de la partida. Si el servidor contesta, la semilla es la
     suya y al terminar se podrá comprobar lo que se ha jugado. Si no
     contesta —o no hay red— se juega igual con la semilla de casa,
     sin subir a la clasificación: nadie se queda sin jugar por eso.

     Y del envío anterior no puede quedar nada. `S.enviada` dice que
     ésta no se ha mandado, pero quien decide si la pantalla de fin
     ofrece subir es ENVIO, que vive en su módulo y sólo lo limpiaba
     la portada: sin esto, repetir el reto heredaba el «marca subida»
     de la anterior y se quedaba sin botón con el que desmentirlo.  */
  S.ticket = null; S.enviada = false; limpiarEnvio();

  /* La partida se pone en blanco ANTES de contar, no después: lo que
     se ve detrás de las tarjetas tiene que ser ya ésta y no los
     restos de la anterior. El escenario se queda vacío solo —`paint()`
     sólo dibuja jugando— y el pie se apaga de golpe, que es lo que
     `numOff()` hace y `num(null)` no.                                */
  S.recordShown = false;
  S.level = 1; S.lives = CONFIG.lives; S.slots = CONFIG.lives; S.streak = 0;
  S.cuts = []; S.score = null; S.pause = null; S.lastShape = null; S.points = 0;
  S.trace = []; S.aim = null; S.res = null; S.world = null;
  S.phase = "count";                  // ni portada ni juego: el trazo aún no cuenta
  $("lives").innerHTML = "";
  $("name").value = "";
  $("scr-intro").hidden = true; $("scr-over").hidden = true;
  $("hype").classList.remove("on");
  armBack();
  UI.lives(); UI.level(); UI.points(true); UI.numOff(); UI.cap({ k:"swipe" });

  /* El vale y la cuenta atrás, a la vez, porque cuestan lo mismo y
     esperar dos veces sería esperar de más.

     `marca` distingue esta llamada de cualquier otra. Contar dura lo
     suyo, y en ese rato caben un «atrás», una vuelta a la portada o
     un segundo toque en «Reintentar»: si al volver aquí ya no manda
     ésta, se sale sin tocar nada. Sin esto, irse a la portada durante
     la cuenta arrancaba una partida por debajo de ella.             */
  const marca = S.arranque = {};
  const [vale] = await Promise.all([
    runStart(S.mode === "daily" ? "daily" : freeBoard(S.runTimer), dayKey()),
    cuentaAtras(marca)
  ]);
  if (S.arranque !== marca || S.phase !== "count") return;

  if (vale && !vale.error && typeof vale.seed === "number"){
    seed = vale.seed;
    S.ticket = vale.ticket;
    S.runTimer = vale.tl;
  }
  setRNG(mulberry32(seed));
  S.seed = seed; S.startedAt = Date.now();
  newLevel();
}
