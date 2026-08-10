/* Dibujo. */

import { CONFIG, TUTOR } from "./config.js";
import { H, S, W, ctx, ink, signal } from "./state.js";
import { TAU } from "./rng.js";
import { advance, timeUp } from "./game.js";
import { bisector, evaluate } from "./geometry.js";
import { clamp } from "./util.js";

export const trace = p => { ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); for (let i=1;i<p.length;i++) ctx.lineTo(p[i].x, p[i].y); ctx.closePath(); };
export const ease  = t => 1 - Math.pow(1-t, 3);

export function drawParts(parts, mode, alpha, tf){
  ctx.save();
  ctx.globalAlpha = alpha;
  if (tf){
    ctx.translate(tf.x || 0, tf.y || 0);
    if (tf.rot){
      ctx.translate(tf.pivot.x, tf.pivot.y);
      ctx.rotate(tf.rot);
      ctx.translate(-tf.pivot.x, -tf.pivot.y);
    }
  }
  for (const p of parts){
    if (p.length < 3) continue;
    trace(p);
    if (mode === "fill"){ ctx.fillStyle = ink(); ctx.fill(); }
    else {
      ctx.strokeStyle = ink(); ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.lineWidth = mode === "bold" ? 1.75 : 1; ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawLine(p0, p1, col, alpha, seg){
  const dx = p1.x - p0.x, dy = p1.y - p0.y, len = Math.hypot(dx,dy) || 1, k = (W + H) * 1.2;
  ctx.save();
  ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(p0.x - dx/len*k, p0.y - dy/len*k);
  ctx.lineTo(p0.x + dx/len*k, p0.y + dy/len*k);
  ctx.stroke();
  if (seg){
    ctx.globalAlpha = .95; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
  }
  ctx.restore();
}

/* pista del tutorial: el corte que sí reparte. A trazos y en el azul
   de la medida válida, para que no se confunda con el trazo propio,
   que va en tinta y continuo. Se recalcula cada fotograma porque la
   figura del último paso gira.                                     */
export function drawGuide(alpha){
  const g = bisector(S.world, TUTOR[S.step].ang || 0);
  const ang = TUTOR[S.step].ang || 0;
  const L = g.R * 1.35 + 24;
  const d = { x: Math.cos(ang), y: Math.sin(ang) };
  ctx.save();
  ctx.globalAlpha = alpha * .55; ctx.strokeStyle = signal(); ctx.lineWidth = 1.5;
  ctx.setLineDash([7, 7]);
  ctx.beginPath();
  ctx.moveTo(g.P.x - d.x*L, g.P.y - d.y*L);
  ctx.lineTo(g.P.x + d.x*L, g.P.y + d.y*L);
  ctx.stroke();
  ctx.restore();
}

/* cuenta atrás: aro que se completa y cifra dentro, discretos */
export function drawClock(cx, cy, r, p, left){
  ctx.save();
  ctx.lineCap = "butt";
  ctx.strokeStyle = ink(); ctx.globalAlpha = .18; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  ctx.globalAlpha = left <= 3 ? .85 : .45; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI/2, -Math.PI/2 + TAU*clamp(p,0,1)); ctx.stroke();
  ctx.globalAlpha = .7; ctx.fillStyle = ink();
  ctx.font = '500 11px "DM Mono", ui-monospace, monospace';
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(String(Math.max(0, Math.ceil(left))), cx, cy + .5);
  ctx.restore();
}

export function render(now){
  requestAnimationFrame(render);
  try { paint(now); }
  catch(err){
    console.error(err);
    /* pase lo que pase en el dibujo, la partida sigue avanzando */
    if (S.phase === "result" && !S.res.done){ S.res.done = true; advance(); }
  }
}

export function paint(now){
  ctx.clearRect(0,0,W,H);
  if (S.phase !== "play" && S.phase !== "result") return;

  const base  = Math.min(W*.34, H*.30);
  const scale = Math.min(base, (Math.min(W,H)/2 - 22) / S.maxR);
  const ampX  = Math.max(0, W/2 - scale*S.maxR - 16);
  const ampY  = Math.max(0, H/2 - scale*S.maxR - 16);

  if (S.phase === "play"){
    const el = (now - S.t0) / 1000;
    const dt = Math.min(.05, (now - S.last) / 1000); S.last = now;
    S.rot += S.rotSpd * dt;
    const dx = Math.min(S.cfg.drift, ampX), dy = Math.min(S.cfg.drift, ampY);
    const cx = W/2 + Math.sin(el*.62)*dx, cy = H/2 + Math.sin(el*.87 + 1.1)*dy;
    const grow = ease(clamp((now - S.t0)/240, 0, 1));
    const sc = scale * (.94 + .06*grow);
    const c = Math.cos(S.rot), s = Math.sin(S.rot);
    S.world = S.shape.map(p => p.map(v => ({
      x: cx + (v.x*c - v.y*s)*sc,
      y: cy + (v.x*s + v.y*c)*sc
    })));

    if (S.limit){
      const left = S.limit - el;
      if (left <= 0){ timeUp(); return; }
      drawClock(W - 26, 26, 14, 1 - left/S.limit, left);
    }

    let a = grow;
    if (S.cfg.ghost) a *= clamp(1 - ((now - S.t0) - S.cfg.ghost)/650, 0, 1);
    const mode = S.cfg.outline ? "bold" : "fill";

    if (S.aim){
      const p0 = S.aim.a, p1 = S.aim.b;
      const dxl = p1.x - p0.x, dyl = p1.y - p0.y, len = Math.hypot(dxl, dyl) || 1;
      const N = { x:-dyl/len, y:dxl/len };
      const r = evaluate(S.world, p0, N);
      /* una mitad sólida, la otra en contorno: la balanza es la lectura */
      drawParts(r.A, mode, a);
      drawParts(r.B, "thin", a * .5);
      drawLine(p0, p1, ink(), .3, true);
    } else {
      drawParts(S.world, mode, a);
    }
    if (S.mode === "tutor" && S.tutorGuide) drawGuide(a);
  }

  if (S.phase === "result"){
    const t = clamp((now - S.res.t0) / (S.res.ok ? CONFIG.hold.ok : CONFIG.hold.fail), 0, 1);
    const e = ease(t);

    if (S.res.timeout){
      /* sin corte y sin línea: la figura simplemente se va */
      drawParts(S.res.parts, "fill", 1 - t*t, { y: 26*t*t });
    } else {
      const N = S.res.N;
      const dir = { x: S.res.P.x + N.y, y: S.res.P.y - N.x };
      if (S.res.ok){
        /* medida válida: las dos mitades se apartan limpias y en paralelo */
        const d = 26*e;
        drawParts(S.res.A, "fill", 1-e, { x: N.x*d, y: N.y*d });
        drawParts(S.res.B, "fill", 1-e, { x:-N.x*d, y:-N.y*d });
        drawLine(S.res.P, dir, signal(), 1 - e*.4, false);
      } else {
        /* fallo: vuelco de balanza — el lado pesado cae y arrastra el eje */
        const k = S.res.k, a = 1 - Math.pow(t, 2.2);
        const phi = .38 * k * S.res.lever * e;
        drawParts(S.res.heavy, "fill", a, { y:  k*34*t*t, rot: phi, pivot: S.res.pv });
        drawParts(S.res.light, "fill", a, { y: -k*12*e,   rot: phi, pivot: S.res.pv });
        ctx.save();
        ctx.translate(S.res.pv.x, S.res.pv.y); ctx.rotate(phi); ctx.translate(-S.res.pv.x, -S.res.pv.y);
        drawLine(S.res.P, dir, ink(), a * .6, false);
        ctx.restore();
      }
    }
    if (t >= 1 && !S.res.done){ S.res.done = true; advance(); }
  }
}
requestAnimationFrame(render);
