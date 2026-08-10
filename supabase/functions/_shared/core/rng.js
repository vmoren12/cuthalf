/* COPIA · generado por tools/sync-core.mjs · no se edita aquí:
   el original es src/rng.js y hay que volver a sincronizar.      */

/* Azar · generador reproducible. El reto diario siembra la misma
   secuencia para todo el mundo, así que la partida es comparable. */

export const TAU = Math.PI * 2;

/* Todo el azar del juego pasa por RNG. En modo libre es Math.random;
   en el reto diario es un generador sembrado con la fecha, así que la
   secuencia de figuras es idéntica para todo el mundo ese día.      */
export let RNG = Math.random;
export function mulberry32(a){
  return function(){
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export const rnd  = (a,b) => a + RNG() * (b - a);
export const rndI = (a,b) => Math.floor(rnd(a, b + 1));
export const pick = a => a[Math.floor(RNG() * a.length)];
/* la partida diaria siembra aquí su secuencia */
export const setRNG = fn => { RNG = fn; };
