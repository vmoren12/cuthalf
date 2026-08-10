/* Quién eres, sin registrarte.

   El aparato se inventa dos cosas la primera vez y no las suelta: un
   identificador, que es público y sale en la clasificación, y un
   secreto, que no sale de aquí. El servidor guarda sólo la huella del
   secreto, así que es lo único que demuestra que la marca es tuya y
   no de alguien que te ha copiado el nombre.

   Lo que esto no es: una cuenta. Si borras los datos del navegador o
   cambias de móvil, empiezas de cero. Es el precio de no pedir un
   correo ni una contraseña, y para un juego es un buen trato.        */

import { DB } from "./storage.js";

const azar = n => {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
};

export const ME = {
  id(){
    let v = DB.get("pid", "");
    if (!v){ v = crypto.randomUUID(); DB.set("pid", v); }
    return v;
  },
  secret(){
    let v = DB.get("psecret", "");
    if (!v){ v = azar(32); DB.set("psecret", v); }
    return v;
  },
  /* el nombre se pide una sola vez, la primera que se termina una
     partida; a partir de ahí las marcas suben solas               */
  name(){ return DB.name(); },
  tieneNombre(){ return !!DB.name(); },
  credenciales(){ return { id: ME.id(), secret: ME.secret() }; }
};
