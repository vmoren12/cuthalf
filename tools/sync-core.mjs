/* El servidor tiene que jugar exactamente igual que el navegador.

   Estos seis módulos no tocan el DOM ni el reloj: son las reglas del
   juego y nada más. Se copian tal cual a la carpeta de la función,
   que es lo que se despliega en Supabase.

   Copiar en vez de importar de fuera es a propósito: deja por escrito
   que el servidor ejecuta una versión concreta, y obliga a pasar por
   aquí —y a desplegar— cuando cambia una regla.

   Uso:  node tools/sync-core.mjs          copia y avisa de lo que cambia
         node tools/sync-core.mjs --check  sólo comprueba, no toca nada
                                           (devuelve 1 si hay diferencias) */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT   = fileURLToPath(new URL("..", import.meta.url));
const ORIGEN = join(ROOT, "src");
const DESTINO = join(ROOT, "supabase", "functions", "_shared", "core");

const NUCLEO = ["config.js", "rng.js", "util.js", "scoring.js", "geometry.js", "shapes.js", "replay.js"];

const soloComprueba = process.argv.includes("--check");
mkdirSync(DESTINO, { recursive: true });

const aviso = "/* COPIA · generado por tools/sync-core.mjs · no se edita aquí:\n" +
              "   el original es src/%s y hay que volver a sincronizar.      */\n\n";

let distintos = 0;
for (const f of NUCLEO){
  const fuente = readFileSync(join(ORIGEN, f), "utf8");
  const nuevo  = aviso.replace("%s", f) + fuente;
  const destino = join(DESTINO, f);
  const viejo  = existsSync(destino) ? readFileSync(destino, "utf8") : null;

  if (viejo === nuevo){ console.log("  =", f); continue; }
  distintos++;
  if (soloComprueba){ console.log("  ≠", f, viejo === null ? "(no está en el servidor)" : "(ha cambiado)"); continue; }
  writeFileSync(destino, nuevo, "utf8");
  console.log("  →", f, viejo === null ? "copiado" : "actualizado");
}

/* Nada de lo que se copia puede depender del navegador: si algo se
   colara, la función fallaría en Supabase y no aquí.                */
for (const f of NUCLEO){
  const t = readFileSync(join(ORIGEN, f), "utf8");
  const m = t.match(/\b(document|window|localStorage|navigator|performance|requestAnimationFrame)\b/);
  if (m) console.log("  ¡OJO!", f, "usa", m[1] + ": eso no existe en el servidor");
}

if (soloComprueba && distintos){
  console.log("\nEl servidor no lleva las reglas de ahora. Ejecuta: node tools/sync-core.mjs");
  process.exit(1);
}
console.log(distintos ? "\nNúcleo sincronizado. Queda desplegar: supabase functions deploy run"
                      : "\nEl servidor ya lleva estas mismas reglas.");
