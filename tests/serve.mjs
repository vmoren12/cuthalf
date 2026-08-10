/* Servidor local de desarrollo.

   Desde que el juego está en módulos ES no se puede abrir el archivo
   directamente: el navegador los bloquea en file://. Hace falta http.

   Uso:  node tests/serve.mjs   →   http://localhost:8765            */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
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
  let p = join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
  if (!existsSync(p)){ res.writeHead(404); res.end("no está: " + req.url); return; }
  res.writeHead(200, {
    "Content-Type": (TYPES[extname(p)] || "text/plain") + "; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(readFileSync(p));
}).listen(PORT, () => console.log("CUTHALF en http://localhost:" + PORT));
