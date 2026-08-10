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

`tests/probe.html` juega una partida entera por dentro —sin ratón ni
dedos— y comprueba la geometría, el guardado, las clasificaciones y
los idiomas. Con el servidor levantado:

```sh
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless \
  --virtual-time-budget=8000 --dump-dom \
  http://localhost:8765/tests/probe.html | grep -o "<title>[^<]*</title>"
```

El resultado de cada comprobación sale en el título de la página.

## Cómo está repartido

```
index.html    estructura, nada más
css/          base · partida · pantallas
src/          config i18n rng util scoring geometry shapes
              storage scores state game render share input menu pwa main
tests/        prueba de humo y servidor local
```

`geometry.js`, `shapes.js`, `rng.js`, `config.js` y `scoring.js` no
tocan el navegador: son el núcleo del juego, y el servidor los usa tal
cual para comprobar las partidas que llegan a la clasificación
mundial.

[DATOS.md](DATOS.md) explica qué se guarda, cómo se puntúa y cómo se
verifica una marca.

## Al desplegar

Sube la versión en `sw.js` y en `src/pwa.js` a la vez. El service
worker se lleva todos los módulos juntos al instalar, y con una lista
vieja la página nueva cargaría piezas de la anterior.
