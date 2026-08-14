# SPLITINHALF · datos y clasificaciones

Todo lo que se guarda, dónde se guarda y con qué criterio se ordena.

---

## 1 · Las cinco clasificaciones

No hay una tabla única, porque no todas las partidas son comparables:
sin límite de tiempo y con tres segundos por figura son dos juegos
distintos.

| Tabla     | Qué mide                                     | Cómo se ordena |
|-----------|----------------------------------------------|----------------|
| `daily`   | El reto de hoy, con las figuras del día      | Mejor partida  |
| `free-0`  | Juego libre, sin límite de tiempo            | Mejor partida  |
| `free-10` | Juego libre, 10 s por figura                 | Mejor partida  |
| `free-5`  | Juego libre, 5 s por figura                  | Mejor partida  |
| `free-3`  | Juego libre, 3 s por figura                  | Mejor partida  |

Las cinco ordenan igual: **por los puntos de una partida** y, a
igualdad, quien llegó antes (`cmp` en [src/scoring.js](src/scoring.js)).

**Los puntos se ganan corte a corte** y no salen de ningún otro sitio:

```
puntos del corte = redondeo(100 × mérito × factor de tiempo)

  mérito         = 1 − error / 7      · 1 el corte exacto, 0 el que roza el límite
  factor tiempo  = ×2 hasta 1,5 s · ×1 a los 4,5 s · suelo de ×0,5
  fallar (error ≥ 7 %)               · 0 puntos

puntos de la partida = la suma de sus cortes
```

Un corte perfecto y rápido vale 200; el mismo corte pensado durante
seis segundos, 50; uno que se salva por los pelos, casi nada. Llegar
lejos sigue puntuando —cada nivel es un corte más— pero ya no puntúa
por sí mismo: se paga por cómo se corta, no por cuántas veces.

**No se acumulan.** Ni por días, ni por meses, ni entre partidas. Los
puntos son el resultado de **una** partida y se ven en directo
mientras se juega, en la telemetría de arriba. En el reto diario cada
día tiene su clasificación y vale su mejor intento: repetirlo mejora
tu marca del día, jugar muchos días no da más puntos.

El reto es **la misma secuencia de figuras para todo el mundo**: la
semilla del generador es la fecha (`mulberry32(hashStr("2026-08-10"))`),
y la regla de tiempo del día se sortea también con la fecha. Por eso el
reto diario es comparable de verdad, y por eso se puede comprobar en el
servidor.

---

## 2 · En el aparato · `localStorage`

Una sola clave, `half.v1`, con un objeto:

| Campo       | Contenido |
|-------------|-----------|
| `v`         | Versión del formato (hoy `3`) |
| `records[]` | Marcas de juego libre: `{ n, lv, av, pts, tl, ts, old?, est? }` |
| `days{}`    | Reto diario por fecha: `"2026-08-10": { lv, av, pts, tries }` |
| `streak`    | `{ last, n }` · racha de días seguidos |
| `name`      | Último nombre usado |
| `pid` `psecret` | Quién eres en el mundo (ver abajo) |
| `lang` `theme` `timer` `board` `scope` | Preferencias |
| `tutorDone` | Si ya se ha visto la práctica guiada |

En una marca: `n` nombre, `lv` nivel alcanzado, `av` precisión media,
`pts` los puntos de esa partida, `tl` límite de tiempo con el que se
jugó (`0` = sin límite), `ts` cuándo se hizo. `old` marca las que
vienen de una versión anterior, que no guardaba `tl`: se colocan en
«sin límite» y la tabla lo avisa. `est` marca las anteriores a los
puntos: nadie apuntó lo que se tardó en cada corte, así que sus puntos
se estiman a ritmo normal al abrirlas y la tabla también lo avisa.

Se guardan **100 marcas por tabla** y **400 días** de reto. Si el
navegador no deja escribir (modo privado), todo funciona igual pero sólo
durante la sesión.

Todo esto se escribe al terminar la partida, sin preguntar: es el
aparato de quien juega y no se ve desde fuera. Lo que sí se pide es
subir a la clasificación mundial (ver el punto 4).

---

## 3 · En el servidor · Supabase

En marcha desde el 11 de agosto de 2026, en el proyecto
`gfrmnlxadxtnsimansvt`. Las migraciones están en
[supabase/migrations/](supabase/migrations/) y la función que acepta
las partidas, en [supabase/functions/run/](supabase/functions/run/).

**Sin registro.** Cada aparato genera al vuelo un identificador y un
secreto que sólo él conoce (`pid` y `psecret` en el almacén local); el
servidor guarda el jugador y la huella del secreto. No hay correo, ni
contraseña, ni forma de entrar desde otro aparato — a cambio, tampoco
hay nada que recordar. Si borras los datos del navegador, empiezas de
cero: es el precio de no pedir nada.

El **nombre** se pide una sola vez, al terminar la primera partida, y
puede cambiarse desde la pantalla de clasificaciones. No es único: dos
jugadores pueden llamarse igual, y lo que distingue a uno de otro es
el secreto, no el nombre.

Es una columna de `players`, o sea **una fila por jugador y no una por
marca**: cambiarlo cambia a la vez todas tus marcas, en las cinco
tablas y en los días del reto ya cerrados. Es a propósito —eres el
mismo jugador con otra etiqueta— y la alternativa es peor: congelar el
nombre en cada marca te dejaría con tres nombres distintos en tres días
del mismo tramo, indistinguible de tres personas, y una errata sería
para siempre, porque aquí no hay cuenta que recuperar. El cambio viaja
al momento por `/run/name` (punto 4); si esa llamada no llega, el
nombre se queda cambiado en el aparato y sube con la siguiente partida.

### `players`

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | `uuid` | clave primaria |
| `name` | `text` | 1–14 caracteres |
| `secret_hash` | `text` | del secreto del aparato, nunca el secreto |
| `country` | `char(2)` | deducido en el servidor, sin guardar la IP |
| `created_at` `updated_at` | `timestamptz` | |

### `runs` — histórico de partidas aceptadas

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | `bigint` | identidad |
| `player_id` | `uuid` | → `players` |
| `board` | `text` | una de las cinco tablas |
| `day` | `date` | sólo en el reto diario |
| `level` | `int` | nivel alcanzado |
| `accuracy` | `numeric(4,1)` | precisión media |
| `points` | `int` | la suma de los cortes, calculada por el servidor |
| `cuts` | `int` | cortes de la partida |
| `ms` | `int` | lo que duró |
| `created_at` | `timestamptz` | |

Es el registro crudo: sirve de auditoría y para revisar sospechas.

### `free_best` y `daily_best` — lo que se consulta

Una fila por jugador y tabla (`free_best`, clave `player_id + board`) y
una por jugador y día (`daily_best`, clave `player_id + day`). Las
mantiene el servidor al aceptar una partida, y son las que leen las
clasificaciones: así una consulta no tiene que recorrer el histórico.
Se queda la mejor de las dos por puntos, así que subir una partida
peor que la tuya no te mueve.

La columna `daily_best.season` no la lee nadie desde que los puntos no
se acumulan; se queda porque es la forma barata de agrupar por mes el
día que haga falta.

### Cómo se leen

Cinco funciones, entre `0002_lecturas.sql` y `0004_puntos.sql`:
`free_board` y `daily_board` devuelven la tabla del mundo; `free_me` y
`daily_me` te sitúan dentro de ella; `board_size` cuenta cuántos sois.
El puesto se calcula sobre la clasificación **entera** y sólo después
se recorta, para que el primero de una página no parezca el primero
del mundo. Las de la temporada —`season_board` y `season_me`— se
borraron al dejar de acumularse los puntos.

### Y por tramos de tiempo · `0006_periodos.sql`

La pantalla de marcas se puede mirar **hoy, este mes o siempre**. Cada
familia tenía ya un tramo y le faltaban dos:

| | hoy | mes | siempre |
|---|---|---|---|
| `daily` | `daily_board` | `daily_span` | `daily_span` (sin corte) |
| `free-*` | `free_span` | `free_span` | `free_board` |

Las nuevas se quedan con **la mejor partida de cada jugador dentro del
tramo**: siguen midiendo una partida, no suman nada. Esto no es la
temporada que se borró.

El reto lo tiene fácil —`daily_best` ya guarda una fila por jugador y
día, así que el tramo es un `where` sobre `day`—. El juego libre no:
`free_best` sólo conserva la mejor de siempre, y tu mejor de agosto no
está en ninguna parte si tu récord es de julio. La única fuente es
`runs`, que tiene RLS **sin políticas**. Por eso `free_span` y
`free_span_me` son las **únicas `security definer` del proyecto**, y
por eso van atadas: devuelven lo mismo que ya enseña la clasificación
—quién y su mejor puntuación del tramo—, nunca una fila cruda; la
tabla pedida se comprueba contra una lista blanca; y el `execute` se
retira de `public` antes de concederlo a `anon`.

El corte de «hoy» viaja como **instante exacto calculado en el
navegador**, no como fecha: `created_at` es UTC y el día es el del
reloj de quien juega. A la una de la madrugada en Madrid, para UTC
todavía es ayer.

El puesto que se ofrece antes de subir una partida **no** sigue este
filtro: se sube a la clasificación de siempre, que es donde se compite.

`daily_best.season` sigue sin leerla nadie — el tramo del mes se
resuelve comparando `day`, que va indexado.

### Permisos

- El cliente **sólo lee** las clasificaciones (clave pública `anon`).
- **Nadie escribe directamente.** Toda marca entra por la función del
  servidor, que es la única con permiso: `submit_run`, `ensure_player`
  y `rename_player` tienen el `execute` retirado para `anon`.
- `rename_player` (`0007_renombrar.sql`) sólo cambia el nombre, y
  **no crea a nadie**: si el jugador no está, contesta `nuevo` y no
  toca nada. A la clasificación se entra jugando, así que no se pueden
  apalabrar nombres sin jugar.
- `player_secrets` y `runs` tienen RLS activada y **ninguna política**:
  existen, pero no enseñan nada a nadie.

Comprobado con la clave pública en la mano: leer las clasificaciones
funciona; leer secretos devuelve vacío; insertar una marca a mano o
llamar a `submit_run` responde *401 permission denied*.

---

## 4 · Cómo se comprueba que una marca es real

Una clasificación mundial abierta sin verificación es una lista de
quien sepa abrir la consola del navegador. Como el juego es
determinista, se puede comprobar de verdad:

1. **Al empezar**, el cliente pide partida. El servidor devuelve una
   semilla y un vale firmado con la hora. En el reto diario la semilla
   es la del día; en juego libre la elige el servidor, para que nadie
   pueda probar mil semillas y quedarse con la más fácil.
2. **Al terminar**, la marca se guarda en el aparato sola, pero al
   servidor no se manda nada hasta que se pulsa «Subir a la
   clasificación»: publicar se ve desde fuera y se pide. Entonces se
   envía el vale y la lista de cortes: por cada nivel, la recta del
   corte **en coordenadas de la figura**, no de la pantalla, y el
   momento en que se hizo. Sin vale la oferta ni aparece: una partida
   que no empezó el servidor no puede comprobarla.
3. **El servidor repite la partida**: genera las mismas figuras con la
   misma semilla, aplica cada corte con la misma geometría y saca su
   propio resultado. Si no coincide con lo declarado, la marca no entra.
4. Además comprueba lo que el cálculo no ve: que el tiempo declarado
   cuadre con el del vale, que no se supere el límite por figura, que el
   vale no se reutilice y que no lleguen partidas a ráfagas.

Para que esto funcione, el servidor ejecuta **los mismos ficheros** que
el navegador: [src/geometry.js](src/geometry.js),
[src/shapes.js](src/shapes.js), [src/rng.js](src/rng.js),
[src/config.js](src/config.js) y [src/scoring.js](src/scoring.js) no
tocan el DOM ni el navegador precisamente por esto. Si cambia una
fórmula ahí, hay que desplegar el servidor a la vez.

---

## 5 · Dominio

El juego vive en **splitinhalf.com** desde el 13 de agosto de 2026. El
DNS lo gestiona Netlify (los cuatro `nsone.net`, delegados desde
Hostinger, que es donde está registrado), el certificado lo renueva
Netlify solo, `www` redirige a la raíz y `http` a `https`.

Nada en el código apunta a un dominio concreto: las rutas del juego son
relativas —el manifiesto arranca en `./`— y la única dirección escrita
es la del servidor, en [src/net.js](src/net.js). Cambiar de dominio no
toca una línea; lo que sí hay que tocar es la lista de orígenes que el
servidor acepta, que es un secreto de la función:

```
ALLOWED_ORIGINS = https://splitinhalf.com,https://www.splitinhalf.com,https://cuthal7.netlify.app
```

Se lee al arrancar la función, así que **cambiar el secreto no basta:
hay que volver a desplegarla**. Si el origen no está en la lista, la
respuesta lleva el primero de ella y el navegador bloquea la llamada:
se puede jugar, pero no pedir vale ni subir marcas.

La dirección vieja de Netlify sigue en la lista a propósito. Quien
instalara el juego desde ella lo tiene instalado *ahí* —para el
navegador son dos orígenes distintos, y una aplicación instalada no se
muda—, así que quitarla le dejaría sin poder subir nada.

Y por lo mismo, el jugador de un dominio no es el del otro: `pid`,
`psecret` y las marcas locales viven en el almacén de cada origen. Al
abrir splitinhalf.com se empieza de cero. No tiene arreglo sin cuentas,
y cuentas es justo lo que este juego no pide.

Mientras no exista el secreto, la función acepta cualquier origen. No
debilita nada —la protección está en el vale y en la repetición de la
partida— pero evita que otra web cuelgue tu clasificación de su página.

## 6 · Limpieza

Las pruebas automáticas juegan de verdad y dejan un jugador llamado
`SONDA` en la clasificación. Usan siempre el mismo perfil, así que no
se multiplica. Para borrarlo:

```sql
delete from players where name in ('SONDA', 'PRUEBA-BORRAR');
```

Se lleva por delante su secreto, sus partidas y sus marcas: las claves
ajenas van en cascada.
