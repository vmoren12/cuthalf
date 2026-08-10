/* Comprueba el vale de la partida fuera de Supabase.

   La firma usa WebCrypto, que en Node es la misma que en Deno, así
   que lo que pase aquí pasará allí.

   Uso:  node --experimental-strip-types tools/test-vale.ts           */

import { firmar, comprobar, huella, type Vale } from "../supabase/functions/_shared/vale.ts";

const LLAVE = "una llave de prueba, larga y aburrida";
let fallos = 0;
const prueba = async (nombre: string, fn: () => Promise<void>) => {
  try { await fn(); console.log("  ok", nombre); }
  catch (e){ console.log("  FALLO", nombre + ":", (e as Error).message); fallos++; }
};

const nuevo = (extra: Partial<Vale> = {}): Vale =>
  ({ s: 12345, b: "free-3", d: null, t: 3, i: Date.now(), j: crypto.randomUUID(), ...extra });

await prueba("un vale recién hecho vale", async () => {
  const v = nuevo();
  const leido = await comprobar(await firmar(v, LLAVE), LLAVE);
  if (!leido) throw new Error("no lo reconoce");
  if (leido.s !== v.s || leido.b !== v.b) throw new Error("lo lee mal");
});

await prueba("con otra llave no vale", async () => {
  const t = await firmar(nuevo(), LLAVE);
  if (await comprobar(t, "otra llave cualquiera")) throw new Error("lo acepta");
});

await prueba("cambiarle la semilla lo estropea", async () => {
  const t = await firmar(nuevo(), LLAVE);
  const [cuerpo, firma] = t.split(".");
  /* el cuerpo se lee sin más: eso está bien, no es un secreto. Lo que
     no se puede es cambiarlo y que la firma siga cuadrando          */
  const dentro = JSON.parse(Buffer.from(cuerpo, "base64url").toString());
  dentro.s = 999;
  const trucado = Buffer.from(JSON.stringify(dentro)).toString("base64url") + "." + firma;
  if (await comprobar(trucado, LLAVE)) throw new Error("cuela un vale manipulado");
});

await prueba("un vale de anteayer ya no sirve", async () => {
  const viejo = nuevo({ i: Date.now() - 7 * 3600_000 });
  if (await comprobar(await firmar(viejo, LLAVE), LLAVE)) throw new Error("acepta uno caducado");
});

await prueba("y uno del futuro tampoco", async () => {
  const raro = nuevo({ i: Date.now() + 10 * 60_000 });
  if (await comprobar(await firmar(raro, LLAVE), LLAVE)) throw new Error("acepta uno con fecha futura");
});

await prueba("basura sin firma", async () => {
  for (const b of ["", "hola", "a.b", "x".repeat(2000), null, 42]){
    if (await comprobar(b as unknown, LLAVE)) throw new Error("acepta: " + String(b).slice(0, 20));
  }
});

await prueba("del secreto sólo se guarda su huella", async () => {
  const h = await huella("secreto-del-aparato-123456789");
  if (h.length !== 64 || !/^[0-9a-f]+$/.test(h)) throw new Error("no parece un SHA-256: " + h);
  if (h === await huella("secreto-del-aparato-123456780")) throw new Error("dos secretos, una huella");
  if (h !== await huella("secreto-del-aparato-123456789")) throw new Error("la huella cambia sola");
});

console.log(fallos ? `\n${fallos} fallo(s)` : "\nEl vale aguanta.");
process.exit(fallos ? 1 : 0);
