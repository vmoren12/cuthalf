-- SPLITINHALF · clasificaciones mundiales
-- Paso 5: barrer lo que se coló entre los dos despliegues.
--
-- La migración anterior vació las tablas, pero la función del servidor
-- se despliega aparte y a mano. Entre una cosa y la otra hubo un rato
-- en el que la base de datos ya ordenaba por puntos y el servidor
-- seguía calculándolos con la fórmula vieja: las partidas jugadas ahí
-- entraron con `nivel × 1000` a cuestas.
--
-- Se reconocen sin mirar la fecha, porque son aritméticamente
-- imposibles: un corte no puede pasar de 200 puntos —cien de base por
-- el doble del factor de tiempo— y una partida no tiene más cortes
-- buenos que niveles menos uno. Así que cualquier marca por encima de
-- `(nivel − 1) × 200` no la ha podido hacer nadie jugando.
--
-- Vale para ahora y para cualquier despiste futuro del mismo tipo: si
-- no hay nada de la escala vieja, no borra nada.

delete from public.runs       where points > greatest(level - 1, 0) * 200;
delete from public.free_best  where points > greatest(level - 1, 0) * 200;
delete from public.daily_best where points > greatest(level - 1, 0) * 200;
