# CUTHALF

Parte cada figura en dos mitades iguales. El error no puede pasar
del 7 %.

Un juego de web instalable (PWA), sin dependencias, sin compilación y
sin registro. Dos maneras de jugar:

- **Reto de hoy** · las mismas figuras para todo el mundo, sorteadas
  por la fecha. Se puede repetir; cuenta el mejor intento del día.
- **Juego libre** · partida infinita, con el reloj que elijas: sin
  límite, 10, 5 o 3 segundos por figura.

## En marcha

Los módulos ES no funcionan abriendo el archivo directamente, hace
falta servirlo por http:

```sh
node tests/serve.mjs        # http://localhost:8765
```

## Prueba

```sh
node tools/probar.mjs      # el juego entero, incluida la clasificación
node tools/test-core.mjs   # sólo las reglas, sin navegador ni red
```

La primera levanta el servidor local, abre el juego en un navegador
sin ventanas y juega partidas de verdad —sin ratón ni dedos—, las sube
a la clasificación mundial y las busca allí. Hace falta conexión y
tarda unos quince segundos.

## Cómo está repartido

```
index.html    estructura, nada más
css/          base · partida · pantallas
src/          config i18n rng util scoring geometry shapes replay
              storage scores state game render share input menu pwa
              net player submit main
supabase/     migraciones y la función que comprueba las partidas
tools/        pruebas, sincronización del núcleo y empaquetado
tests/        prueba de humo y servidor local
```

`config.js`, `rng.js`, `util.js`, `scoring.js`, `geometry.js`,
`shapes.js` y `replay.js` no tocan el navegador: son el núcleo del
juego, y el servidor los ejecuta tal cual para comprobar las partidas
que llegan a la clasificación mundial.

## Si cambias una regla del juego

La tolerancia del 7 %, las vidas, la curva de dificultad o la fórmula
de puntos viven a los dos lados. Al tocarlas:

```sh
node tools/sync-core.mjs        # lleva el núcleo a la función
node tools/build-function.mjs   # rehace build/run.ts
node tools/test-core.mjs        # comprueba que sigue cuadrando
```

y vuelve a desplegar la función. Si el navegador juega con reglas
nuevas y el servidor con las viejas, empezará a rechazar partidas
buenas.

[DATOS.md](DATOS.md) explica qué se guarda, cómo se puntúa y cómo se
verifica una marca.

## Al desplegar

Sube la versión en `sw.js` y en `src/pwa.js` a la vez. El service
worker se lleva todos los módulos juntos al instalar, y con una lista
vieja la página nueva cargaría piezas de la anterior.
