# SPLITINHALF · datos y clasificaciones

Todo lo que se guarda, dónde se guarda y con qué criterio se ordena.

---

## 1 · Las cinco clasificaciones

No hay una tabla única, porque no todas las partidas son comparables:
sin límite de tiempo y con tres segundos por figura son dos juegos
distintos.

| Tabla     | Qué mide                                     | Cómo se ordena |
|-----------|----------------------------------------------|----------------|
| `daily`   | El reto diario, acumulado por temporadas     | Puntos del mes |
| `free-0`  | Juego libre, sin límite de tiempo            | Mejor partida  |
| `free-10` | Juego libre, 10 s por figura                 | Mejor partida  |
| `free-5`  | Juego libre, 5 s por figura                  | Mejor partida  |
| `free-3`  | Juego libre, 3 s por figura                  | Mejor partida  |

**Orden de una partida** (`cmp` en [src/scoring.js](src/scoring.js)):
primero el nivel alcanzado; a igualdad, la precisión media; y si aun
así empatan, quien lo consiguió antes.

**Puntos de una partida**:

```
puntos = nivel × 1000 + redondeo(precisión × 10)
```

Es el mismo criterio, escrito como un número que se puede sumar: un
nivel más siempre gana, y la precisión sólo desempata. Nivel 12 con
97,4 % de precisión son 12 974 puntos.

**Temporada**: el mes natural (`2026-08`). El reto diario acumula, día
a día, los puntos del **mejor intento de cada día**. Se puede repetir
el reto tantas veces como se quiera; sólo cuenta el mejor. El día 1 de
cada mes la clasificación arranca de cero y el mes cerrado pasa al
histórico.

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
| `v`         | Versión del formato (hoy `2`) |
| `records[]` | Marcas de juego libre: `{ n, lv, av, tl, ts, old? }` |
| `days{}`    | Reto diario por fecha: `"2026-08-10": { lv, av, tries }` |
| `streak`    | `{ last, n }` · racha de días seguidos |
| `name`      | Último nombre usado |
| `pid` `psecret` | Quién eres en el mundo (ver abajo) |
| `lang` `theme` `timer` `board` `scope` | Preferencias |
| `tutorDone` | Si ya se ha visto la práctica guiada |

En una marca: `n` nombre, `lv` nivel alcanzado, `av` precisión media,
`tl` límite de tiempo con el que se jugó (`0` = sin límite), `ts` cuándo
se hizo. `old` marca las que vienen de una versión anterior, que no
guardaba `tl`: se colocan en «sin límite» y la tabla lo avisa.

Se guardan **100 marcas por tabla** y **400 días** de reto. Si el
navegador no deja escribir (modo privado), todo funciona igual pero sólo
durante la sesión.

Todo esto se escribe al terminar la partida, sin preguntar: es el
aparato de quien juega y no se ve desde fuera. Lo que sí se pide es
subir a la clasificación mundial (ver el punto 4).

---

## 3 · En el servidor · Supabase

En marcha desde el 11 de agosto de 2026, en el proyecto
`gfrmnlxadxtnsimansvt`. Las tres migraciones están en
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
| `points` | `int` | calculado con la fórmula de arriba |
| `cuts` | `int` | cortes de la partida |
| `ms` | `int` | lo que duró |
| `created_at` | `timestamptz` | |

Es el registro crudo: sirve de auditoría y para revisar sospechas.

### `free_best` y `daily_best` — lo que se consulta

Una fila por jugador y tabla (`free_best`, clave `player_id + board`) y
una por jugador y día (`daily_best`, clave `player_id + day`). Las
mantiene el servidor al aceptar una partida, y son las que leen las
clasificaciones: así una consulta no tiene que recorrer el histórico.

La temporada sale de `daily_best`: sumar `points` agrupando por jugador
y mes.

### Cómo se leen

Siete funciones en `0002_lecturas.sql`: `free_board`, `daily_board` y
`season_board` devuelven la tabla del mundo; `free_me`, `daily_me` y
`season_me` te sitúan dentro de ella; `board_size` cuenta cuántos
sois. El puesto se calcula sobre la clasificación **entera** y sólo
después se recorta, para que el primero de una página no parezca el
primero del mundo.

### Permisos

- El cliente **sólo lee** las clasificaciones (clave pública `anon`).
- **Nadie escribe directamente.** Toda marca entra por la función del
  servidor, que es la única con permiso: `submit_run` y
  `ensure_player` tienen el `execute` retirado para `anon`.
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

Nada en el código apunta a un dominio concreto: las rutas del juego son
relativas y la dirección del servidor vive en [src/net.js](src/net.js).
Al pasar de la dirección de Netlify a un dominio propio sólo habrá que
fijar los orígenes permitidos en Supabase, con un secreto más:

```
ALLOWED_ORIGINS = https://splitinhalf.com,https://tu-sitio.netlify.app
```

Mientras no exista, la función acepta cualquier origen. No debilita
nada —la protección está en el vale y en la repetición de la partida—
pero evita que otra web cuelgue tu clasificación de su página.

## 6 · Limpieza

Las pruebas automáticas juegan de verdad y dejan un jugador llamado
`SONDA` en la clasificación. Usan siempre el mismo perfil, así que no
se multiplica. Para borrarlo:

```sql
delete from players where name in ('SONDA', 'PRUEBA-BORRAR');
```

Se lleva por delante su secreto, sus partidas y sus marcas: las claves
ajenas van en cascada.
