/* Subir una partida a la clasificación mundial.

   Se manda el vale y la lista de cortes; lo que vuelve son las
   cuentas del servidor, que son las que mandan. Puede que no
   coincidan al último decimal con las de aquí —cada uno mide con sus
   números— y en ese caso el que vale es él.

   Si algo falla, se dice y se sigue: la marca ya está guardada en el
   aparato desde antes de intentarlo.                                 */

import { $, S } from "./state.js";
import { T } from "./i18n.js";
import { ME } from "./player.js";
import { meDaily, meFree, runSubmit } from "./net.js";
import { freeBoard, seasonOf } from "./scoring.js";
import { dayKey } from "./util.js";

/* cómo va el envío de la partida que se acaba de terminar */
export const ENVIO = { estado: "", texto: "" };

/* La nota de debajo la comparten dos cosas: lo que ha pasado con la
   partida —que lo escribe la pantalla de fin— y lo que pasa con el
   envío. Mientras el envío tenga algo que contar, manda él; cuando no
   hay envío en marcha ni acaba de terminar uno, no se toca.        */
function pintar(){
  const fila = $("world-row"), nota = $("entry-note");
  if (ENVIO.estado === "hecho"){
    fila.hidden = false;
    $("world-pos").textContent = ENVIO.texto;
    nota.hidden = true;                 // el puesto ya lo cuenta todo
  } else {
    fila.hidden = true;
  }
  if (ENVIO.estado === "enviando" || ENVIO.estado === "fallo" || ENVIO.estado === "sin-red"){
    nota.hidden = false;
    nota.textContent = ENVIO.texto;
  }
}

export function limpiarEnvio(){
  ENVIO.estado = ""; ENVIO.texto = "";
  const fila = $("world-row");
  if (fila) fila.hidden = true;
}

export async function enviarPartida(){
  if (S.enviada || !ME.tieneNombre()) return;
  /* Sin vale no hay partida que comprobar: se jugó sin conexión. Antes
     esto se llamaba solo y callar era lo correcto; ahora lo ha pedido
     alguien, y a una petición hay que contestarle algo.             */
  if (!S.ticket || !S.trace.length){
    ENVIO.estado = "sin-red"; ENVIO.texto = T("offline"); pintar(); return;
  }
  S.enviada = true;

  ENVIO.estado = "enviando"; ENVIO.texto = T("sending"); pintar();

  const r = await runSubmit({
    ticket: S.ticket,
    cuts:   S.trace,
    player: ME.credenciales(),
    name:   ME.name()
  });

  /* Sin respuesta no se sabe si llegó. Se deja volver a intentarlo —si
     había llegado, el vale único lo dirá— porque perder la marca por
     un túnel es peor que un mensaje raro.                           */
  if (!r){ S.enviada = false; ENVIO.estado = "sin-red"; ENVIO.texto = T("offline"); pintar(); return; }
  if (r.error){ ENVIO.estado = "fallo"; ENVIO.texto = T("notSent") + " · " + r.error; pintar(); return; }

  /* ya está dentro: ahora se pregunta en qué puesto ha quedado */
  const puesto = S.mode === "daily"
    ? await meDaily(ME.id(), dayKey())
    : await meFree(ME.id(), freeBoard(S.score ? S.score.tl : 0));

  const fila = Array.isArray(puesto) ? puesto[0] : null;
  ENVIO.estado = "hecho";
  ENVIO.texto  = fila ? T("rankOf")(fila.pos, fila.total) : "—";
  pintar();
}

/* para volver a pintar cuando se cambia de idioma con la pantalla
   de fin abierta                                                    */
export function repintarEnvio(){ pintar(); }
