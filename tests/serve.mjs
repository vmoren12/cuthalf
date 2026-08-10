/* Servidor local de desarrollo.

   Desde que el juego está en módulos ES no se puede abrir el archivo
   directamente: el navegador los bloquea en file://. Hace falta http.

   Uso:  node tests/serve.mjs   →   http://localhost:8765            */
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, extname } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PORT = 8765;
const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json",
  ".webmanifest": "application/manifest+json"
};

createServer((req, res) => {
  /* Un reloj de verdad para la prueba.

     El navegador sin ventanas corre con el tiempo acelerado, así que
     un setTimeout de dos segundos no cuesta dos segundos. El servidor
     de la clasificación mide el tiempo por su cuenta y rechazaría una
     partida de cinco cortes hecha en un suspiro. Esperar por la red sí
     cuesta lo que dice: el tiempo virtual se detiene mientras haya una
     petición en el aire.                                             */
  if (req.url.startsWith("/esperar")){
    const ms = Math.min(+new URL(req.url, "http://x").searchParams.get("ms") || 0, 20000);
    setTimeout(() => { res.writeHead(204, { "Cache-Control": "no-store" }); res.end(); }, ms);
    return;
  }

  /* La prueba cuenta aquí cómo le ha ido.

     Leer el resultado del título de la página obliga a volcar el DOM,
     y eso pasa al cargar, no al terminar. Contándolo por aquí, la
     prueba puede tomarse el tiempo que necesite —incluido el de hablar
     con el servidor de la clasificación— y el resultado espera en un
     fichero.                                                          */
  if (req.url === "/resultado" && req.method === "POST"){
    let cuerpo = "";
    req.on("data", t => cuerpo += t);
    req.on("end", () => {
      writeFileSync(join(ROOT, "tests", ".ultimo-resultado.txt"), cuerpo, "utf8");
      console.log("\n" + cuerpo + "\n");
      res.writeHead(204); res.end();
    });
    return;
  }

  let p = join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
  if (!existsSync(p)){ res.writeHead(404); res.end("no está: " + req.url); return; }
  res.writeHead(200, {
    "Content-Type": (TYPES[extname(p)] || "text/plain") + "; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(readFileSync(p));
}).listen(PORT, () => console.log("CUTHALF en http://localhost:" + PORT));
