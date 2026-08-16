# SPLITINHALF · lo que hay que saber antes de tocar nada

Juego de web instalable (PWA) con clasificaciones mundiales sin
registro. Sin dependencias, sin compilación: lo que hay en el
repositorio es lo que se sirve.

En línea: **splitinhalf.com** (y la dirección vieja,
cuthal7.netlify.app, que sigue viva porque hay gente con el juego
instalado desde ella) · código: **github.com/vmoren12/cuthalf**
Servidor: Supabase, proyecto `gfrmnlxadxtnsimansvt`.

---

## Al empezar una sesión

1. **Leer el grafo del proyecto**: `graphify-out/GRAPH_REPORT.md`.
   Dice qué módulos hay, cuáles son los nodos más conectados y por
   dónde pasa todo. Para preguntas concretas:

   ```sh
   graphify explain "doCut()"                 # qué hace y con quién habla
   graphify path "src/game.js" "src/net.js"   # cómo se llega de A a B
   ```

   El skill `/graphify` está instalado en `~/.claude/skills/`, así que
   también vale preguntar en lenguaje llano por la arquitectura y deja
   que él consulte el grafo.

   Aviso: el núcleo del juego está **dos veces** en el grafo, en
   `src/` y en la copia que ejecuta el servidor
   (`supabase/functions/_shared/core/`). No es un error, es lo que
   hace que las dos partes puntúen igual — pero deja nombres
   repetidos, así que `path` entre funciones sueltas suele avisar de
   ambigüedad. Entre ficheros funciona bien, y `explain` también.

2. **Comprobar si el grafo está al día.** El hook lo reconstruye justo
   *antes* de cada commit, así que su contenido es el del código que
   se confirma, aunque el «Built from commit» del informe lleve el
   hash del commit **anterior** — no puede llevar el de uno que
   todavía no existe. Ese desfase de uno es normal y no significa que
   esté viejo.

   Está viejo de verdad si `git status` enseña cambios sin confirmar
   en `src/` o en `supabase/`. Entonces: `graphify update .`

3. Si se va a tocar puntuación, clasificaciones o el servidor, leer
   antes [DATOS.md](DATOS.md): explica el modelo de datos entero.

## Al terminar cualquier cambio

Tres pasos, siempre, en este orden:

```sh
node tools/probar.mjs      # el juego entero, incluida la clasificación
graphify update .          # el grafo, que si no queda mintiendo
git add -A && git commit   # con un mensaje que explique el porqué
```

Y `git push` cuando el usuario lo pida. El grafo se versiona: si se
actualiza el código y no el grafo, la siguiente sesión empieza con un
mapa equivocado, que es peor que no tener mapa.

Del grafo no hace falta acordarse: hay un hook en `.claude/settings.json`
que, ante cualquier orden que contenga `git commit`, ejecuta
`graphify update .` y añade el resultado antes de que el commit se
haga. Lo ejecuta el programa, no el modelo, así que no depende de que
nadie lo recuerde. Las pruebas sí hay que lanzarlas a mano: tardan y
piden red, y un hook que se salta cuando molesta no es una garantía.

---

## Cómo está repartido

```
index.html    estructura, nada más
css/          base · partida · pantallas
src/          config i18n rng util scoring geometry shapes replay
              storage scores state game render share input menu pwa
              net player submit main
supabase/     migraciones y la función que comprueba las partidas
tools/        pruebas, sincronización del núcleo y empaquetado
tests/        prueba de humo, servidor local y retratos de pantalla
```

**El núcleo** —`config.js`, `rng.js`, `util.js`, `scoring.js`,
`geometry.js`, `shapes.js`, `replay.js`— no toca el navegador. El
servidor ejecuta esos mismos ficheros para comprobar las partidas.

## Si cambias una regla del juego

La tolerancia del 7 %, las vidas, la curva de dificultad o la fórmula
de puntos viven a los dos lados:

```sh
node tools/sync-core.mjs        # lleva el núcleo a la función
node tools/build-function.mjs   # rehace build/run.ts
node tools/test-core.mjs        # comprueba que sigue cuadrando
```

y hay que **volver a desplegar la función** en Supabase (pegar
`build/run.ts` en el editor de Edge Functions). Si el navegador juega
con reglas nuevas y el servidor con las viejas, empezará a rechazar
partidas buenas.

## Al desplegar

Sube la versión en `sw.js` **y** en `src/pwa.js` a la vez. El service
worker se lleva todos los módulos juntos al instalar; con una lista
vieja, la página nueva cargaría piezas de la anterior.

---

## Decisiones que no son evidentes

**Las partidas se comprueban repitiéndolas.** El juego es determinista:
con la misma semilla salen las mismas figuras. El cliente apunta cada
corte **en coordenadas de la figura**, no de la pantalla —el error es
una proporción de áreas, y una proporción no cambia al mover, girar o
agrandar—, y el servidor vuelve a jugar la partida. No compara con lo
que diga el navegador: calcula él. Por eso los casos límite de
redondeo no rechazan a nadie.

**La semilla del juego libre la reparte el servidor.** Si la eligiera
el jugador, podría probar mil hasta dar con una cómoda.

**Guardar es automático; publicar, no.** Guardar en el aparato no le
cuesta nada a nadie ni se ve desde fuera, así que la marca entra en su
tabla —y el intento en el reto del día— al terminar, como siempre.
Subir a la clasificación se hace delante de todo el mundo, así que se
pide: un solo botón, `subirPartida()` en `src/game.js`, que al pulsarlo
se convierte en el puesto mundial. Irse sin tocarlo no pierde nada.

Por eso no hay un botón de «no subir»: una opción que cuesta un toque
para conseguir lo mismo que no hacer nada sobra siempre. Y sin vale del
servidor la oferta ni aparece —esa partida no se puede comprobar—: en
su sitio se dice que no ha subido.

**Y sólo se ofrece si subir mueve algo.** Un botón que no cambia
ninguna tabla que el jugador pueda mirar le hace decidir a cambio de
nada. La regla es una para las cinco tablas: la partida tiene que
superar **tu mejor marca subida hoy**. En el reto eso es exactamente
mejorar tu marca del día. En juego libre hace falta ese umbral y no el
récord de siempre, porque los tramos «hoy» y «mes» de la pantalla de
marcas se leen del histórico de partidas subidas (`runs`): tu mejor
partida de hoy mueve una fila aunque tu récord de julio siga por
encima. Se retira el botón **sólo con el dato en la mano**: si la
consulta no llegó, se ofrece.

Encima va el nombre con el que se sube —relleno, editable— y **el
puesto que ocuparía**, que se cuenta aquí (`puestoProyectado()` en
`src/scores.js`) sobre los cien primeros de la tabla, no se le pregunta
al servidor: es contar cuántos van por delante de una cifra y no
merecía una función nueva. Ese puesto es el de la tabla donde se
compite —el reto de hoy, o la de siempre— y no sigue al tramo: decir
«quedarías 3.º» contando sólo hoy sería mentir. Si tu marca de esa
tabla ya era mejor, se dice que seguirías donde estás; y si además no
hay nada que mover, esa frase se queda sola. Lo cuenta [DATOS.md](DATOS.md).

**Nada se escribe desde el navegador.** La clave `anon` sólo lee.
`submit_run`, `ensure_player` y `rename_player` tienen el `execute`
retirado para `anon`; la única forma de entrar en la clasificación es
jugando — y por eso `rename_player` renombra pero no crea jugadores.

**El nombre es del jugador, no de la marca.** Vive en una columna de
`players` y las clasificaciones lo leen con un join, así que cambiarlo
alcanza a todas tus marcas y a los días del reto ya cerrados. Sin
cuentas, la identidad es el secreto del aparato y el nombre sólo es la
etiqueta: congelarlo por marca dejaría a uno con tres nombres en tres
días del mismo tramo, y una errata sería para siempre. `renameMe()` en
`src/menu.js` avisa al servidor al momento (`/run/name`); si no llega,
el cambio se queda hecho aquí y sube con la siguiente partida.

**Cinco tablas, no una.** Sin límite y con 3 s por figura no son el
mismo juego. Cada marca guarda con qué reloj se hizo.

**Los puntos se ganan en el corte.** Cada acierto paga por dos cosas:
lo cerca que ha quedado del reparto exacto —medido contra el margen
del 7 %, no contra el 100 %, que es donde está todo el juego— y lo
deprisa que ha salido (×2 hasta segundo y medio, ×1 a los cuatro y
medio, suelo de ×0,5). Fallar no resta: no paga. La partida vale la
suma de sus cortes, y por eso el marcador va en el HUD, en directo:
sube con cada corte y es la única forma de ver qué lo sube.

**Y no se acumulan.** Ni por días ni por meses. No hay temporada: cada
día del reto tiene su clasificación y vale su mejor intento. Jugar más
días no da más puntos, y ésa es la decisión, no un descuido.

Los intentos tampoco cuentan en ninguna tabla. `daily_best` tuvo una
columna `tries` y se retiró (`0008_intentos.sql`): no la pintaba
ninguna pantalla, no ordenaba ninguna clasificación, y era el último
efecto que le quedaba a subir una partida que no mejora nada. El
aparato sigue contando los suyos en `localStorage`, que es de donde
sale el sello de récord, y para nada más.

La pantalla de marcas sí se puede mirar por tramos —hoy, mes,
siempre—, pero eso no es acumular: cada tramo enseña **la mejor
partida** de cada uno dentro de él. Cada familia recuerda su tramo por
separado (`S.periods`), porque el reto se abre en el día de hoy y el
juego libre en la tabla de siempre. Lo cuenta [DATOS.md](DATOS.md).

El reloj de cada corte es lo único de la partida que el servidor no
puede recalcular —lo apunta el navegador y viaja en el envío—, así que
el factor de tiempo **se satura** a partir de segundo y medio: por
debajo de ahí no hay nada que ganar declarando prisas imposibles.

**Nada del juego depende de que el servidor responda.** Sin red se
juega igual, con semilla local y sin subir nada.

**La cuenta atrás no es un adorno.** Tres tarjetas partidas por la
mitad —`CUENTA` y `cuentaAtras()` en `src/game.js`, el efecto en
`.flap` de `css/game.css`— antes de la primera figura. Da tiempo a
mirar y a colocar el dedo, que en un juego que paga ×2 hasta segundo
y medio no es poco. Y corre **a la vez** que se pide el vale, así que
la espera de red se gasta contando: si el servidor tarda menos que
las tres tarjetas, no se nota que se le haya esperado. Mientras dura,
`S.phase` vale `"count"` — ni portada ni juego, así que el trazo no
cuenta y «Cerrar» sale sin preguntar. El compás vive en `CUENTA` y
viaja al CSS en `--flip`; las pruebas lo ponen a cero.

## Trampas que ya nos han mordido

- **`_headers` sin extensión.** Se llamaba `_headers.txt` y Netlify
  nunca lo leyó: el HTML y el service worker se cacheaban.
- **En Netlify, un fichero que existe gana a la regla de redirección.**
  Sin `force = true`, la regla no llega a aplicarse. Así estuvo
  `tests/probe.html` abierto al público, jugando solo y sembrando
  jugadores en el ranking. Ahora la propia página se niega a
  ejecutarse fuera de `localhost`.
- **`.graphifyignore` sustituye a `.gitignore`**, no se suma. Al
  crearlo, el perfil de Chrome de las pruebas entró en el grafo y lo
  multiplicó por cien.
- **`DB.add` sobrescribía el nombre del jugador** con el de cada marca.
  El nombre es la identidad en la clasificación: se cambia sólo cuando
  lo cambia el usuario.
- **Las pruebas no pueden depender del reloj del navegador sin
  ventanas**: va acelerado, y el servidor mide el tiempo por su
  cuenta. Por eso `tests/serve.mjs` tiene una ruta `/esperar` que
  cuesta segundos de verdad.
- **Chrome en Windows no abre ventanas de menos de ~500 px**: una
  captura de 420 recorta la página y parece un fallo de diseño que no
  existe. Medir con `tests/foto.html?medir=1` antes de tocar CSS.

## Cómo se prueba

```sh
node tools/probar.mjs       # 23 comprobaciones, con red: juega y sube
node tools/test-core.mjs    # 9 comprobaciones de las reglas, sin red
node tools/probar.mjs && node tools/test-core.mjs
node tests/serve.mjs        # http://localhost:8765 para mirarlo a ojo
```

`tests/probe.html` carga el `index.html` de verdad, no una copia, así
que no puede quedarse desfasada cuando cambie la interfaz.
`tests/foto.html?p=scores` retrata una pantalla y mide sus anchos.

## Estilo

Comentarios y mensajes de commit **en castellano**, explicando el
porqué y no el qué. El código sigue el estilo que ya hay: sin
dependencias, sin abreviaturas crípticas y con las decisiones
raras justificadas ahí mismo, donde se leen.
