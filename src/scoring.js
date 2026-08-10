/* Puntuación · el criterio que ordena a los jugadores del mundo.

   Sin dependencias y sin tocar nada de fuera: este fichero se copia
   tal cual al servidor, que tiene que puntuar exactamente igual que
   el navegador. Si aquí cambia una fórmula, cambia allí.            */

/* Orden de una clasificación: primero el nivel alcanzado; a igualdad,
   la precisión media; y si aun así empatan, quien llegó antes.      */
export const cmp = (a, b) => b.lv - a.lv || b.av - a.av || a.ts - b.ts;

/* El mismo criterio, como un número que se puede sumar. Un nivel más
   siempre gana (1000 puntos) y la precisión sólo desempata (máximo
   1000 con el 100%). Es lo que acumula la temporada del reto diario. */
export const points = (lv, av) => lv * 1000 + Math.round(av * 10);

/* Las clasificaciones. El juego libre va separado por regla de
   tiempo: sin límite y con tres segundos por figura no son el mismo
   juego, y mezclarlos no dice nada de nadie.                        */
export const BOARDS = ["daily", "free-0", "free-10", "free-5", "free-3"];
export const freeBoard = tl => "free-" + (tl || 0);
export const boardTime = board => board.startsWith("free-") ? +board.slice(5) : null;
export const isBoard = board => BOARDS.includes(board);

/* Temporada: el mes natural. "2026-08-10" → "2026-08" */
export const seasonOf = day => String(day).slice(0, 7);
