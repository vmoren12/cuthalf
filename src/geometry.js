/* Geometría · área, centroide, corte por una recta y evaluación
   del reparto. Todo son funciones puras: el servidor las reutiliza
   para comprobar las partidas. */

import { CONFIG } from "./config.js";

export const area = p => { let a = 0; for (let i = 0, n = p.length; i < n; i++){ const q = p[(i+1)%n]; a += p[i].x*q.y - q.x*p[i].y; } return a/2; };
export const centroid = p => {
  let a = 0, x = 0, y = 0;
  for (let i = 0, n = p.length; i < n; i++){
    const b = p[(i+1)%n], f = p[i].x*b.y - b.x*p[i].y;
    a += f; x += (p[i].x + b.x) * f; y += (p[i].y + b.y) * f;
  }
  a *= .5; return a ? { x: x/(6*a), y: y/(6*a) } : { x:0, y:0 };
};

/* Recorte por semiplano (Sutherland–Hodgman). Válido también en
   polígonos cóncavos: los puentes degenerados aportan área nula. */
export function clipHalf(poly, P, N, sign){
  const out = [], n = poly.length;
  for (let i = 0; i < n; i++){
    const a = poly[i], b = poly[(i+1)%n];
    const da = sign * ((a.x-P.x)*N.x + (a.y-P.y)*N.y);
    const db = sign * ((b.x-P.x)*N.x + (b.y-P.y)*N.y);
    if (da >= 0) out.push(a);
    if ((da > 0 && db < 0) || (da < 0 && db > 0)){
      const t = da / (da - db);
      out.push({ x: a.x + (b.x-a.x)*t, y: a.y + (b.y-a.y)*t });
    }
  }
  return out;
}

export function evaluate(parts, P, N){
  const A = [], B = []; let aA = 0, aB = 0;
  for (const p of parts){
    const a = clipHalf(p, P, N,  1), b = clipHalf(p, P, N, -1);
    if (a.length > 2){ A.push(a); aA += Math.abs(area(a)); }
    if (b.length > 2){ B.push(b); aB += Math.abs(area(b)); }
  }
  const tot = aA + aB;
  return { A, B, aA, aB, err: tot > 0 ? Math.abs(aA - aB) / tot * 100 : 100 };
}

/* Corte que parte de verdad la figura en dos, en la dirección `ang`.
   Se busca la altura por bisección: pasar por el centro de áreas no
   basta — en un triángulo, una recta cualquiera por el baricentro se
   va hasta el 11 % y la pista del tutorial suspendería su propio
   examen.                                                          */
export function bisector(parts, ang){
  const N = { x: -Math.sin(ang), y: Math.cos(ang) };
  const c = partsCentroid(parts);
  let R = 1;
  for (const p of parts) for (const v of p) R = Math.max(R, Math.hypot(v.x - c.x, v.y - c.y));
  let lo = -R, hi = R, P = c;
  for (let i = 0; i < 22; i++){
    const mid = (lo + hi) / 2;
    P = { x: c.x + N.x*mid, y: c.y + N.y*mid };
    const r = evaluate(parts, P, N);
    if (r.aA > r.aB) lo = mid; else hi = mid;
  }
  return { P, N, R };
}
/* centro de masas de un conjunto de polígonos */
export function partsCentroid(list){
  let a = 0, x = 0, y = 0;
  for (const p of list){ const ar = Math.abs(area(p)), c = centroid(p); a += ar; x += c.x*ar; y += c.y*ar; }
  return a ? { x: x/a, y: y/a } : { x:0, y:0 };
}

export function normalize(parts){
  let tot = 0, cx = 0, cy = 0;
  for (const p of parts){ const a = Math.abs(area(p)), c = centroid(p); tot += a; cx += c.x*a; cy += c.y*a; }
  cx /= tot; cy /= tot;
  const s = Math.sqrt(CONFIG.targetArea / tot);
  return parts.map(p => p.map(v => ({ x:(v.x-cx)*s, y:(v.y-cy)*s })));
}
