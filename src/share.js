/* Tarjeta compartible. */

import { $, COL, S } from "./state.js";
import { DAILY } from "./storage.js";
import { T } from "./i18n.js";

export const WORD_D = "M0 0H56V14H0Z M0 86H56V100H0Z M0 0H15V100H0Z M66 0H81V100H66Z M113 0H128V100H113Z M66 86H128V100H66Z M138 0H196V14H138Z M159.5 0H174.5V100H159.5Z M206 0H221V100H206Z M253 0H268V100H253Z M221 44H253V58H221Z M304 0H318L293 100H278Z M304 0H318L344 100H329Z M293 66H330V80H293Z M354 0H369V100H354Z M354 86H406V100H354Z M400 0H460L455.8 14H400Z M400 44H446.8L442.6 58H400Z M446 0H460L430 100H416Z";
export const stamp = () => {
  const d = new Date();
  return String(d.getDate()).padStart(2,"0") + "." + String(d.getMonth()+1).padStart(2,"0") + "." + d.getFullYear();
};
export const modeLine = () => (S.mode === "daily" ? T("cardDaily") + " " + stamp() : T("cardFree"))
  + " \u00B7 " + (S.runTimer ? S.runTimer + " s" : T("noLimit"));

export function shareText(){
  return "CUTHAL7 \u00B7 " + modeLine() + "\n"
       + T("levelWord") + " " + String(S.score.lv).padStart(2,"0") + " \u00B7 " + S.score.av.toFixed(1) + "%"
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

  /* logotipo y su línea de corte, de borde a borde */
  const k = 620/462, wy = 120;
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

  g.font = sans(64); g.fillStyle = SIG;
  g.fillText(S.score.av.toFixed(1) + "%", PAD, 772);
  track("5px"); g.font = mono(26); g.fillStyle = INK; g.globalAlpha = .55;
  g.fillText(T("accuracy").toUpperCase(), PAD, 822);

  /* pie: dato secundario y, en el reto, la racha */
  const foot = [ T("bestCut").toUpperCase() + " " + S.score.best.toFixed(1) + "%" ];
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
  const file = new File([blob], "cuthalf.png", { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })){
    try { await navigator.share({ files: [file], text }); return; }
    catch(e){ if (e && e.name === "AbortError") return; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "cuthalf.png"; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  try { await navigator.clipboard.writeText(text); } catch(e){}
  toast(T("cardSaved"));
}
