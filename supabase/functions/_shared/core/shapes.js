/* COPIA · generado por tools/sync-core.mjs · no se edita aquí:
   el original es src/shapes.js y hay que volver a sincronizar.      */

/* Catálogo de figuras. */

import { TAU, pick, rnd, rndI } from "./rng.js";

export const ring = (n, r, phase=0) => Array.from({length:n}, (_,i) => {
  const a = phase + i*TAU/n, k = typeof r === "function" ? r(a,i) : r;
  return { x: Math.cos(a)*k, y: Math.sin(a)*k };
});

export const SHAPES = {
  circle:   () => [ ring(160, 1) ],
  square:   () => [ ring(4, 1, Math.PI/4) ],
  triangle: () => [ ring(3, 1, -Math.PI/2) ],
  ngon:     () => [ ring(rndI(5,8), 1, rnd(0,TAU)) ],

  convex: () => {
    const n = rndI(5,9), p = [];
    for (let i = 0; i < n; i++){
      const a = i*TAU/n + rnd(-.22,.22)*TAU/n, r = rnd(.6, 1.1);
      p.push({ x: Math.cos(a)*r, y: Math.sin(a)*r });
    }
    return [p];
  },

  star: () => {
    const n = rndI(5,7), k = rnd(.38,.6), p = [];
    for (let i = 0; i < n*2; i++){
      const a = i*Math.PI/n, r = i % 2 ? k : 1;
      p.push({ x: Math.cos(a)*r, y: Math.sin(a)*r });
    }
    return [p];
  },

  blob: () => {
    const f1 = rnd(0,TAU), f2 = rnd(0,TAU), f3 = rnd(0,TAU);
    return [ ring(180, a => 1 + .22*Math.sin(3*a+f1) + .12*Math.sin(5*a+f2) + .045*Math.sin(7*a+f3)) ];
  },

  ell: () => {
    const w = rnd(.5,.85);
    return [[ {x:-.9,y:-.9},{x:.9,y:-.9},{x:.9,y:-.9+w},{x:-.9+w,y:-.9+w},{x:-.9+w,y:.9},{x:-.9,y:.9} ]];
  },

  cross: () => {
    const w = rnd(.28,.42);
    return [[ {x:-w,y:-1},{x:w,y:-1},{x:w,y:-w},{x:1,y:-w},{x:1,y:w},{x:w,y:w},
              {x:w,y:1},{x:-w,y:1},{x:-w,y:w},{x:-1,y:w},{x:-1,y:-w},{x:-w,y:-w} ]];
  },

  chevron: () => {
    const d = rnd(.35,.75);
    return [[ {x:-.7,y:-1},{x:.1,y:-1},{x:.95,y:0},{x:.1,y:1},{x:-.7,y:1},{x:-.7+d,y:0} ]];
  },

  comb: () => {
    const t = rndI(3,4), w = 2/(2*t-1), base = rnd(-.35,-.1), p = [{x:-1,y:-.9},{x:1,y:-.9}];
    for (let i = t-1; i >= 0; i--){
      const xr = -1 + (2*i+1)*w, xl = -1 + 2*i*w;
      p.push({x:xr,y:.9},{x:xl,y:.9});
      if (i > 0) p.push({x:xl,y:base},{x:-1+(2*i-1)*w,y:base});
    }
    return [p];
  },

  /* Piezas separadas: el área ya no está en un solo bloque. */
  multi: () => {
    const a = pick([ ring(120,1), ring(4,1,Math.PI/4), ring(3,1,-Math.PI/2) ]);
    const b = pick([ ring(120,1), ring(4,1,Math.PI/4), ring(6,1) ]);
    const ka = rnd(.5,.7), kb = rnd(.35,.55), dy = rnd(-.3,.3);
    return [
      a.map(v => ({ x: v.x*ka - .8, y: v.y*ka - dy })),
      b.map(v => ({ x: v.x*kb + .95, y: v.y*kb + dy }))
    ];
  }
};
