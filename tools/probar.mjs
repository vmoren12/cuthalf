/* Pasa la prueba del juego entero de una sentada.

   Levanta el servidor local, abre la página de pruebas en un
   navegador sin ventanas y espera a que cuente cómo le ha ido. La
   prueba juega partidas de verdad, las sube a la clasificación
   mundial y las busca allí, así que hace falta conexión y tarda unos
   quince segundos.

   Uso:  node tools/probar.mjs                                        */

import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const RESULTADO = join(ROOT, "tests", ".ultimo-resultado.txt");

const NAVEGADORES = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
].filter(p => p && existsSync(p));

if (!NAVEGADORES.length){
  console.error("No encuentro Chrome ni Edge. Indica la ruta con la variable CHROME.");
  process.exit(1);
}

rmSync(RESULTADO, { force: true });

const servidor = spawn(process.execPath, [join(ROOT, "tests", "serve.mjs")], { stdio: "ignore" });
const esperar = ms => new Promise(r => setTimeout(r, ms));
await esperar(800);

/* El perfil es siempre el mismo a propósito: así las pruebas usan
   siempre el mismo jugador y no siembran uno nuevo en la
   clasificación cada vez que se ejecutan.                          */
const navegador = spawn(NAVEGADORES[0], [
  "--headless=new", "--disable-gpu", "--no-sandbox",
  "--window-size=430,900",
  "--remote-debugging-port=9222",            // mantiene vivo el navegador
  "--user-data-dir=" + join(ROOT, "tests", ".perfil"),
  "http://localhost:8765/tests/probe.html"
], { stdio: "ignore" });

let texto = null;
for (let i = 0; i < 45 && texto === null; i++){
  await esperar(1000);
  if (existsSync(RESULTADO)) texto = readFileSync(RESULTADO, "utf8");
}

navegador.kill(); servidor.kill();

if (texto === null){
  console.error("La prueba no ha terminado en 45 s.");
  process.exit(1);
}

console.log(texto);
const fallos = texto.split("\n").filter(l => l.startsWith("FALLO") || l.startsWith("ERROR"));
console.log(fallos.length ? `\n${fallos.length} fallo(s)` : "\nTodo en orden.");
process.exit(fallos.length ? 1 : 0);
