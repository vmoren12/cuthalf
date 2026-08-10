/* Configuración · reglas del juego, curva de dificultad y práctica guiada. */

/* ═══════════════════════════════════════════════════════════════
   1 · CONFIGURACIÓN
   ═══════════════════════════════════════════════════════════════ */
export const CONFIG = {
  lives: 3,               // vidas iniciales
  maxLives: 5,            // tope absoluto
  streak: 7,              // aciertos seguidos que dan una vida
  tolerance: 7,          // % de error máximo para superar el nivel
  minSwipe: 26,          // px mínimos de trazo
  hold: { ok: 800, fail: 1150 },
  targetArea: Math.PI,
  /* techo de dificultad: la partida es infinita, pero los parámetros
     dejan de crecer aquí. Más allá es resistencia, no ruleta.      */
  ceiling: { rot: .45, drift: 34, ghost: 700 },
  timers: [0, 10, 5, 3], // segundos por figura · 0 = sin límite
  dailyTimers: [0, 10, 5], // regla de tiempo que puede tocar en el reto
  keep: 100,             // marcas guardadas por cada tabla
  keepDays: 400,         // días del reto diario que se recuerdan
  nameMax: 14
};

export const STAGES = [
  { from: 1,  shapes:["square","circle","triangle"],              rot:0,   drift:0  },
  { from: 3,  shapes:["ngon","convex","triangle"],                rot:.14, drift:0  },
  { from: 5,  shapes:["star","ell","cross","convex"],             rot:.22, drift:0  },
  { from: 7,  shapes:["blob","chevron","comb","star"],            rot:.30, drift:16 },
  { from: 10, shapes:["convex","blob","comb","chevron","ell"],    rot:.40, drift:26, outline:true },
  { from: 13, shapes:["multi","comb","blob","star","ell"],        rot:.10, drift:0,  ghost:1500 }
];

export function levelConfig(n){
  let s = STAGES[0];
  for (const st of STAGES) if (n >= st.from) s = st;
  const over = Math.max(0, n - 16), C = CONFIG.ceiling;
  return {
    shapes : s.shapes,
    rot    : Math.min(C.rot,   (s.rot   || 0) * (1 + over * .05)),
    drift  : Math.min(C.drift, (s.drift || 0) * (1 + over * .05)),
    outline: !!s.outline,
    ghost  : s.ghost ? Math.max(C.ghost, s.ghost - over * 60) : 0
  };
}

/* Práctica guiada: cuatro figuras quietas y sin reloj, una idea cada
   una. `guide` enseña de entrada una línea que sí parte la figura en
   dos; en los pasos que no la traen, aparece sólo si fallas. `ang` es
   la dirección de esa línea, no su altura: la altura se calcula para
   que el reparto sea exacto, así que el consejo nunca miente.      */
export const TUTOR = [
  { shape:"circle",   tip:"tut1", guide:true,  ang:0        },
  { shape:"square",   tip:"tut2", guide:true,  ang:Math.PI/4 },
  { shape:"triangle", tip:"tut3", guide:false, ang:0        },
  { shape:"ell",      tip:"tut4", guide:false, ang:0, rot:.18 }
];
