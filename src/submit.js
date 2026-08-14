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
import { runSubmit } from "./net.js";

/* cómo va el envío de la partida que se acaba de terminar */
export const ENVIO = { estado: "", texto: "" };

/* La nota de debajo la comparten dos cosas: lo que ha pasado con la
   partida —que lo escribe la pantalla de fin— y lo que pasa con el
   envío. Mientras el envío tenga algo que contar, manda él; cuando no
   hay envío en marcha ni acaba de terminar uno, no se toca.

   Al terminar bien salen dos cosas: que ha entrado, y el camino a la
   tabla donde ha entrado. El texto de «hecho» se resuelve al pintar y
   no se guarda, que así el cambio de idioma también lo alcanza.    */
function pintar(){
  const nota = $("entry-note"), verMarcas = $("over-scores");
  const hecho = ENVIO.estado === "hecho";
  verMarcas.hidden = !hecho;
  if (hecho){
    nota.hidden = false;
    nota.textContent = T("sent");
  } else if (ENVIO.estado === "enviando" || ENVIO.estado === "fallo" || ENVIO.estado === "sin-red"){
    nota.hidden = false;
    nota.textContent = ENVIO.texto;
  }
}

/* Deshace lo que dejó pintado, las dos cosas: si sólo se retirara el
   botón, la frase de que la marca subió seguiría en pantalla hasta el
   siguiente repintado — y entre empezar una partida y que el servidor
   dé el vale hay un viaje de red por delante.                       */
export function limpiarEnvio(){
  ENVIO.estado = ""; ENVIO.texto = "";
  const verMarcas = $("over-scores"), nota = $("entry-note");
  if (verMarcas) verMarcas.hidden = true;
  if (nota) nota.hidden = true;
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

  /* Ya está dentro. Aquí se preguntaba además en qué puesto había
     quedado, para enseñarlo: una cifra suelta que no llevaba a
     ninguna parte. Ahora se ofrece la tabla entera, donde el puesto
     se ve en su sitio y con quién tienes delante — y es una petición
     menos.                                                          */
  ENVIO.estado = "hecho"; ENVIO.texto = "";
  pintar();
}

/* para volver a pintar cuando se cambia de idioma con la pantalla
   de fin abierta                                                    */
export function repintarEnvio(){ pintar(); }
