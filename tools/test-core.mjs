/* Comprueba que el núcleo copiado al servidor funciona sin navegador.

   Node no es Deno, pero para código que sólo hace cuentas la
   diferencia no existe: si esto pasa aquí, pasa allí. Lo que de
   verdad se comprueba es que no se haya colado nada del navegador y
   que la repetición sea determinista.

   Uso:  node tools/test-core.mjs                                    */

import { replay, levelShape } from "../supabase/functions/_shared/core/replay.js";
import { setRNG, mulberry32 } from "../supabase/functions/_shared/core/rng.js";
import { hashStr, dayTimer } from "../supabase/functions/_shared/core/util.js";
import { CUT, cutPoints, timeFactor, isBoard, boardTime } from "../supabase/functions/_shared/core/scoring.js";
import { bisector } from "../supabase/functions/_shared/core/geometry.js";

let fallos = 0;
const prueba = (nombre, fn) => {
  try { fn(); console.log("  ok", nombre); }
  catch (e){ console.log("  FALLO", nombre + ":", e.message); fallos++; }
};

/* Una partida impecable: en cada nivel, la recta que parte la figura
   exactamente por la mitad. Se genera consumiendo el azar en el mismo
   orden que la repetición, que es lo que las mantiene sincronizadas. */
function partidaPerfecta(semilla, niveles){
  setRNG(mulberry32(semilla >>> 0));
  let level = 1, last = null;
  const cuts = [];
  for (let i = 0; i < niveles; i++){
    const { shape, name } = levelShape(level, last);
    last = name;
    const b = bisector(shape, 0.3 + i * 0.11);   // un ángulo distinto cada vez
    cuts.push({ P: b.P, N: b.N, ms: 900 });
    level++;
  }
  return cuts;
}

const partida = partidaPerfecta(12345, 14);

prueba("una partida impecable se acepta entera", () => {
  const r = replay(12345, partida);
  if (!r.ok) throw new Error("la rechaza: " + r.reason);
  if (r.level !== 15) throw new Error("14 cortes buenos deberían dejar el nivel en 15, da " + r.level);
  if (r.av < 99.9)    throw new Error("precisión demasiado baja para cortes exactos: " + r.av);
  if (r.over)         throw new Error("no debería quedarse sin vidas");
  /* siete aciertos seguidos dan una vida, y con catorce son dos */
  if (r.lives !== 5)  throw new Error("las vidas de premio no cuadran: " + r.lives);
});

prueba("repetir dos veces da lo mismo", () => {
  const a = replay(12345, partida);
  const b = replay(12345, partida);
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error("dos repeticiones no coinciden");
});

prueba("los cortes de una partida no valen para otra", () => {
  const otra = replay(999, partida);
  if (otra.ok && otra.level === 15)
    throw new Error("los mismos cortes cuelan con otra semilla");
});

prueba("el reloj de la figura se respeta", () => {
  const tarde = [{ P:{x:0,y:0}, N:{x:0,y:1}, ms: 9000 }];
  const r = replay(1, tarde, 3);
  if (r.ok) throw new Error("acepta un corte hecho a los 9 s con 3 s de reloj");
});

prueba("no se aceptan cortes después del final", () => {
  /* cortes malos hasta quedarse sin vidas, y tres de propina */
  const malos = Array.from({ length: 8 }, () => ({ P:{x:.95,y:.95}, N:{x:1,y:0}, ms: 500 }));
  const r = replay(7, malos);
  if (r.ok) throw new Error("no se ha quejado de los cortes sobrantes");
});

prueba("la fórmula de puntos", () => {
  /* el corte perfecto y rápido vale el doble que el perfecto y lento */
  if (cutPoints(0, 1200) !== 200) throw new Error("corte perfecto y rápido: " + cutPoints(0, 1200));
  if (cutPoints(0, 4500) !== 100) throw new Error("corte perfecto a ritmo normal: " + cutPoints(0, 4500));
  if (cutPoints(0, 30000) !== 50) throw new Error("el suelo del tiempo no aguanta: " + cutPoints(0, 30000));
  /* fallar no puntúa, y rozar el límite tampoco da casi nada */
  if (cutPoints(7, 1000) !== 0)   throw new Error("un fallo puntúa: " + cutPoints(7, 1000));
  if (cutPoints(99, 1000) !== 0)  throw new Error("un desastre puntúa: " + cutPoints(99, 1000));
  if (cutPoints(6.9, 1500) > 6)   throw new Error("colar un corte paga demasiado: " + cutPoints(6.9, 1500));
  /* y la precisión manda: a igual tiempo, mejor corte, más puntos */
  if (!(cutPoints(1, 3000) > cutPoints(3, 3000))) throw new Error("la precisión no ordena");
  if (!(cutPoints(1, 2000) > cutPoints(1, 4000))) throw new Error("la rapidez no ordena");
  if (timeFactor(0) !== CUT.top || timeFactor(1e9) !== CUT.floor)
    throw new Error("el factor de tiempo se sale de sus topes");
});

prueba("los puntos de una partida son la suma de sus cortes", () => {
  const r = replay(12345, partida);
  const suma = r.detail.reduce((a, d) => a + (d.pts || 0), 0);
  if (r.points !== suma) throw new Error(r.points + " frente a " + suma);
  /* catorce cortes exactos a 900 ms: el tope de cada uno */
  if (r.points !== 14 * CUT.base * CUT.top) throw new Error("una partida impecable da " + r.points);
});

prueba("el reto del día sale de la fecha", () => {
  if (hashStr("2026-08-11") !== hashStr("2026-08-11")) throw new Error("la huella no es estable");
  if (hashStr("2026-08-11") === hashStr("2026-08-12")) throw new Error("dos días con la misma semilla");
  const t = dayTimer("2026-08-11");
  if (![0, 10, 5].includes(t)) throw new Error("reloj imposible: " + t);
});

prueba("los nombres de las tablas", () => {
  if (!isBoard("free-3") || !isBoard("daily")) throw new Error("no reconoce tablas buenas");
  if (isBoard("free-7") || isBoard("../etc")) throw new Error("acepta tablas inventadas");
  if (boardTime("free-10") !== 10 || boardTime("daily") !== null) throw new Error("mal el reloj de la tabla");
});

prueba("la figura de un nivel es siempre la misma", () => {
  setRNG(mulberry32(42)); const a = JSON.stringify(levelShape(5, null));
  setRNG(mulberry32(42)); const b = JSON.stringify(levelShape(5, null));
  if (a !== b) throw new Error("la misma semilla da figuras distintas");
});

console.log(fallos ? `\n${fallos} fallo(s)` : "\nEl núcleo del servidor está bien.");
process.exit(fallos ? 1 : 0);
