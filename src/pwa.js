/* Actualización de la aplicación. */

import { S } from "./state.js";

/* ── Actualizaciones ──────────────────────────────────────────────
   El service worker sirve el HTML con red primero, así que al abrir
   con conexión siempre llega la última versión. Si además cambia el
   propio worker, se recarga la página: nunca durante una partida.  */
export const APP_VERSION = "2026.08.16-11";
export let swReg = null, pendingReload = false, reloading = false;

export function applyUpdate(){
  if (reloading) return;
  if (S.phase === "play" || S.phase === "result" || S.phase === "paused"){
    pendingReload = true;             // se aplicará al terminar
    return;
  }
  reloading = true;
  location.reload();
}

if ("serviceWorker" in navigator && location.protocol.startsWith("http")){
  const hadController = !!navigator.serviceWorker.controller;
  addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js?page=" + encodeURIComponent(location.pathname))
      .then(reg => {
        swReg = reg;
        reg.addEventListener("updatefound", () => {
          const w = reg.installing;
          if (w) w.addEventListener("statechange", () => {
            if (w.state === "installed" && navigator.serviceWorker.controller) w.postMessage?.("skipWaiting");
          });
        });
      })
      .catch(() => {});
  });
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController) applyUpdate();
  });
}

/* al volver a la app (o a la pestaña) se comprueba si hay versión nueva */
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  if (swReg) swReg.update().catch(() => {});
  if (pendingReload) applyUpdate();
});
