/* Arranque · el único módulo que carga la página.

   Los tres imports sin nombre están por lo que hacen al cargarse:
   render pone en marcha el bucle de dibujo, input engancha el trazo
   del corte y pwa registra el service worker.                       */

import { DB } from "./storage.js";
import { S, UI, refreshColors, resize } from "./state.js";
import { applyLang, mq, setTheme } from "./menu.js";
import "./render.js";
import "./input.js";
import "./pwa.js";

const savedTheme = DB.get("theme", null);
setTheme(savedTheme ? savedTheme === "dark" : mq.matches, false);
mq.addEventListener("change", e => { if (!DB.get("theme", null)) setTheme(e.matches, false); });
S.timer = DB.get("timer", 0);
S.board = DB.get("board", "daily");
S.scope = DB.get("scope", "world");
applyLang(DB.get("lang", /^(es|ca|gl)/i.test(navigator.language || "") ? "es" : "en"));
UI.lives(); UI.level(); refreshColors(); resize();
