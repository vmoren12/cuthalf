/* Junta la función del servidor en un solo fichero.

   El editor web de Supabase despliega una carpeta suelta, y nuestra
   función se apoya en siete módulos del núcleo que viven en src/.
   Esto los cose en un único fichero para poder pegarlo allí.

   No reescribe nada: pega los ficheros en orden y quita las líneas de
   import que los unían, que dentro de un mismo fichero sobran. Las
   reglas del juego que acaban dentro son las de src/, así que el
   servidor sigue jugando exactamente igual que el navegador.

   Uso:  node tools/build-function.mjs                                */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/* el orden es el de las dependencias: cada uno sólo usa lo anterior */
const PIEZAS = [
  "src/config.js",
  "src/rng.js",
  "src/util.js",
  "src/scoring.js",
  "src/geometry.js",
  "src/shapes.js",
  "src/replay.js",
  "supabase/functions/_shared/vale.ts",
  "supabase/functions/run/index.ts"
];

const cabecera = `/* CUTHALF · función «run», en un solo fichero.
 *
 * GENERADO por tools/build-function.mjs · no se edita aquí.
 * Los originales son src/*.js, _shared/vale.ts y run/index.ts.
 *
 * Se pega tal cual en el editor de Edge Functions de Supabase, en una
 * función llamada «run». Cada vez que cambie una regla del juego hay
 * que volver a generarlo y a pegarlo, o el servidor puntuará con las
 * reglas viejas.
 */

import { createClient } from "npm:@supabase/supabase-js@2";

`;

const trozos = [];
for (const p of PIEZAS){
  const texto = readFileSync(join(ROOT, p), "utf8");
  const limpio = texto
    .split("\n")
    /* fuera los imports entre piezas y el de la biblioteca, que ya
       está arriba; lo demás se queda intacto                        */
    .filter(l => !/^import .*from ["']\.{1,2}\//.test(l) && !/^import .*from ["']npm:/.test(l))
    .join("\n")
    .trim();

  trozos.push(`/* ══ ${p} ${"═".repeat(Math.max(3, 62 - p.length))} */\n\n${limpio}`);
}

const salida = cabecera + trozos.join("\n\n\n") + "\n";
mkdirSync(join(ROOT, "build"), { recursive: true });
const destino = join(ROOT, "build", "run.ts");
writeFileSync(destino, salida, "utf8");

const sueltos = salida.split("\n").filter(l => /^import /.test(l));
console.log("build/run.ts ·", salida.split("\n").length, "líneas,",
            (salida.length / 1024).toFixed(1) + " KB");
console.log("imports que quedan:", sueltos.length === 1 ? sueltos[0] : sueltos);
