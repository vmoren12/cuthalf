/* Tarjeta compartible. */

import { $, COL, S } from "./state.js";
import { DAILY } from "./storage.js";
import { T } from "./i18n.js";

/* El logotipo, el mismo dibujo que el de index.html. Se repite aquí
   porque el lienzo no puede leerlo del DOM: si se toca una letra, hay
   que tocarla en los dos sitios. 638 unidades de ancho por 100 de
   alto, y la raya de corte a la altura 51.                          */
export const WORD_D = "M0 0H56V14H0Z M0 0H15V58H0Z M0 44H56V58H0Z M41 44H56V100H41Z M0 86H56V100H0Z M66 0H122V14H66Z M66 0H81V100H66Z M107 0H122V58H107Z M66 44H122V58H66Z M132 0H147V100H132Z M132 86H184V100H132Z M194 0H209V100H194Z M219 0H277V14H219Z M240.5 0H255.5V100H240.5Z M287 0H302V100H287Z M312 0H327V100H312Z M359 0H374V100H359Z M312 0H327L374 100H359Z M384 0H399V100H384Z M431 0H446V100H431Z M399 44H431V58H399Z M482 0H496L471 100H456Z M482 0H496L522 100H507Z M471 66H508V80H471Z M532 0H547V100H532Z M532 86H584V100H532Z M578 0H638L633.8 14H578Z M578 44H624.8L620.6 58H578Z M624 0H638L608 100H594Z";
export const WORD_W = 638;
export const stamp = () => {
  const d = new Date();
  return String(d.getDate()).padStart(2,"0") + "." + String(d.getMonth()+1).padStart(2,"0") + "." + d.getFullYear();
};
export const modeLine = () => (S.mode === "daily" ? T("cardDaily") + " " + stamp() : T("cardFree"))
  + " \u00B7 " + (S.runTimer ? S.runTimer + " s" : T("noLimit"));

export function shareText(){
  return "SPLITINHAL7 \u00B7 " + modeLine() + "\n"
       + S.score.pts.toLocaleString() + " " + T("pointsWord").toLowerCase()
       + " \u00B7 " + T("levelWord") + " " + String(S.score.lv).padStart(2,"0")
       + " \u00B7 " + S.score.av.toFixed(1) + "%"
       + (/^https?:/.test(location.protocol) ? "\n" + location.href.split("?")[0] : "");
}

export async function buildCard(){
  try { await document.fonts.ready; } catch(e){}
  const Z = 1080, PAD = 92, c = document.createElement("canvas");
  c.width = c.height = Z;
  const g = c.getContext("2d");
  const INK = COL.ink, SIG = COL.signal;
  g.fillStyle = getComputedStyle(document.body).getPropertyValue("--ground").trim();
  g.fillRect(0, 0, Z, Z);

  /* Logotipo y su línea de corte, de borde a borde. Se dibuja a 800 px
     de ancho —no a 620— porque el nombre nuevo es medio ancho más
     largo, y a igual ancho la palabra quedaba una banda fina: lo que
     se mantiene es el alto, que es lo que le da presencia.          */
  const k = 800/WORD_W, wy = 120;
  g.save(); g.translate(PAD, wy); g.scale(k, k);
  g.fillStyle = INK; g.fill(new Path2D(WORD_D));
  g.restore();
  g.fillStyle = SIG; g.fillRect(0, wy + 51*k - 2, Z, 4);

  const mono = px => '500 ' + px + 'px "DM Mono", ui-monospace, monospace';
  const sans = px => '600 ' + px + 'px "Archivo", system-ui, sans-serif';
  const track = v => { if ("letterSpacing" in g) g.letterSpacing = v; };
  g.textBaseline = "alphabetic"; g.textAlign = "left"; g.fillStyle = INK;

  track("5px"); g.font = mono(26); g.globalAlpha = .55;
  g.fillText(modeLine().toUpperCase(), PAD, 330);

  track("0px"); g.globalAlpha = 1; g.font = sans(300);
  g.fillText("N." + String(S.score.lv).padStart(2,"0"), PAD - 10, 660);

  /* la cifra en azul es la que se compite: los puntos de la partida */
  g.font = sans(64); g.fillStyle = SIG;
  g.fillText(S.score.pts.toLocaleString(), PAD, 772);
  track("5px"); g.font = mono(26); g.fillStyle = INK; g.globalAlpha = .55;
  g.fillText(T("pointsWord").toUpperCase(), PAD, 822);

  /* pie: datos secundarios y, en el reto, la racha */
  const foot = [ T("accuracy").toUpperCase() + " " + S.score.av.toFixed(1) + "%",
                 T("bestCut").toUpperCase() + " " + S.score.best.toFixed(1) + "%" ];
  if (S.mode === "daily") foot.push(T("streak").toUpperCase() + " " + DAILY.streak().n);
  g.font = mono(24); g.globalAlpha = .5;
  g.fillText(foot.join("   \u00B7   "), PAD, 930);
  track("0px");
  g.globalAlpha = .18; g.fillStyle = INK; g.fillRect(PAD, 962, Z - PAD*2, 1);

  if (/^https?:/.test(location.protocol)){
    g.globalAlpha = .5; g.font = mono(24); track("4px");
    g.fillText((location.host + location.pathname).replace(/\/index\.html$/,"").toUpperCase(), PAD, 1010);
  }
  return c;
}

export let toastT = null;
export function toast(msg){
  const el = $("toast");
  el.textContent = msg; el.classList.add("on");
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("on"), 2400);
}

export async function shareCard(){
  if (!S.score) return;
  const text = shareText();
  let card;
  try { card = await buildCard(); } catch(e){ console.error(e); toast(T("cardFail")); return; }
  const blob = await new Promise(r => card.toBlob(r, "image/png"));
  if (!blob){ toast(T("cardFail")); return; }
  const file = new File([blob], "splitinhalf.png", { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })){
    try { await navigator.share({ files: [file], text }); return; }
    catch(e){ if (e && e.name === "AbortError") return; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "splitinhalf.png"; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  try { await navigator.clipboard.writeText(text); } catch(e){}
  toast(T("cardSaved"));
}
