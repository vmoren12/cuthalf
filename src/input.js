/* Entrada · el trazo del corte. */

import { S, stage } from "./state.js";
import { doCut } from "./game.js";

export const pt = e => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

document.addEventListener("pointerdown", e => {
  if (S.phase !== "play" || e.target.closest("button, input")) return;
  S.aim = { a: pt(e), b: pt(e) };
});
document.addEventListener("pointermove", e => { if (S.aim) S.aim.b = pt(e); });
document.addEventListener("pointerup", () => {
  if (!S.aim || S.phase !== "play") return;
  const { a, b } = S.aim; S.aim = null; doCut(a, b);
});
document.addEventListener("pointercancel", () => { S.aim = null; });
document.addEventListener("contextmenu", e => e.preventDefault());
