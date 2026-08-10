/* El vale de una partida.

   Se entrega al empezar y hay que devolverlo al terminar. Lleva
   dentro la semilla, el reloj y la hora, y va firmado: el navegador
   puede leerlo, pero no puede cambiarle una coma sin que la firma
   deje de cuadrar. La llave está sólo aquí, en el servidor.

   Sirve para tres cosas: que la semilla la reparta el servidor y no
   el jugador, que se sepa cuándo empezó la partida, y que la misma
   partida no se pueda entregar dos veces.                           */

const codificador = new TextEncoder();

const aBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const deBase64Url = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));

async function llave(secreto: string){
  return await crypto.subtle.importKey(
    "raw", codificador.encode(secreto),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
  );
}

export interface Vale {
  s: number;            // semilla
  b: string;            // tabla
  d: string | null;     // día, sólo en el reto diario
  t: number;            // segundos por figura, 0 = sin límite
  i: number;            // cuándo se entregó
  j: string;            // identificador único, para que no se repita
}

export async function firmar(vale: Vale, secreto: string): Promise<string> {
  const cuerpo = aBase64Url(codificador.encode(JSON.stringify(vale)));
  const firma  = new Uint8Array(await crypto.subtle.sign("HMAC", await llave(secreto), codificador.encode(cuerpo)));
  return cuerpo + "." + aBase64Url(firma);
}

/* Devuelve el vale si la firma cuadra y no ha caducado; si no, null.
   No dice qué ha fallado: a quien lo esté probando no se le explica. */
export async function comprobar(texto: unknown, secreto: string, maxHoras = 6): Promise<Vale | null> {
  if (typeof texto !== "string" || texto.length > 1024) return null;
  const [cuerpo, firma] = texto.split(".");
  if (!cuerpo || !firma) return null;

  let vale: Vale;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC", await llave(secreto), deBase64Url(firma), codificador.encode(cuerpo)
    );
    if (!ok) return null;
    vale = JSON.parse(new TextDecoder().decode(deBase64Url(cuerpo)));
  } catch { return null; }

  const edad = Date.now() - vale.i;
  if (!(edad >= -60_000 && edad < maxHoras * 3600_000)) return null;  // ni del futuro ni de anteayer
  return vale;
}

/* Del secreto del aparato sólo se guarda su huella. */
export async function huella(secreto: string): Promise<string> {
  const b = new Uint8Array(await crypto.subtle.digest("SHA-256", codificador.encode(secreto)));
  return [...b].map(x => x.toString(16).padStart(2, "0")).join("");
}
