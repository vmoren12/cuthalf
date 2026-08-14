# Graph Report - cuthalf  (2026-08-14)

## Corpus Check
- 47 files · ~39,973 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 313 nodes · 869 edges · 14 communities (12 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4e8de13d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]

## God Nodes (most connected - your core abstractions)
1. `$()` - 56 edges
2. `T()` - 32 edges
3. `paintOver()` - 16 edges
4. `start()` - 15 edges
5. `paintScores()` - 14 edges
6. `paint()` - 13 edges
7. `pedirMundo()` - 13 edges
8. `worldRows()` - 13 edges
9. `applyLang()` - 12 edges
10. `freeBoard()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `partidaPerfecta()` --calls--> `bisector()`  [EXTRACTED]
  tools/test-core.mjs → supabase/functions/_shared/core/geometry.js
- `partidaPerfecta()` --calls--> `levelShape()`  [EXTRACTED]
  tools/test-core.mjs → supabase/functions/_shared/core/replay.js
- `partidaPerfecta()` --calls--> `mulberry32()`  [EXTRACTED]
  tools/test-core.mjs → supabase/functions/_shared/core/rng.js
- `partidaPerfecta()` --calls--> `setRNG()`  [EXTRACTED]
  tools/test-core.mjs → supabase/functions/_shared/core/rng.js
- `tutorStep()` --calls--> `T()`  [EXTRACTED]
  src/game.js → src/i18n.js

## Import Cycles
- None detected.

## Communities (14 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (60): finishTutor(), goHome(), tutorChrome(), L, setLang(), T(), savedTheme, applyLang() (+52 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (42): levelConfig(), gameOver(), guardarMarca(), newLevel(), paintOver(), saveMark(), start(), startTutor() (+34 more)

### Community 2 - "Community 2"
Cohesion: 0.16
Nodes (25): CONFIG, STAGES, TUTOR, advance(), doCut(), timeUp(), area(), bisector() (+17 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (30): CONFIG, levelConfig(), STAGES, TUTOR, area(), bisector(), centroid(), clipHalf() (+22 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (34): hayRemoto(), meDaily(), meDailySpan(), meFree(), meFreeSpan(), NET, pedir(), REMOTO (+26 more)

### Community 5 - "Community 5"
Cohesion: 0.14
Nodes (13): 1 · Las cinco clasificaciones, 2 · En el aparato · `localStorage`, 3 · En el servidor · Supabase, 4 · Cómo se comprueba que una marca es real, 5 · Dominio, 6 · Limpieza, Cómo se leen, `free_best` y `daily_best` — lo que se consulta (+5 more)

### Community 6 - "Community 6"
Cohesion: 0.25
Nodes (6): fallos, navegador, NAVEGADORES, RESULTADO, ROOT, servidor

### Community 7 - "Community 7"
Cohesion: 0.29
Nodes (6): Al desplegar, Cómo está repartido, En marcha, Prueba, Si cambias una regla del juego, SPLITINHALF

### Community 8 - "Community 8"
Cohesion: 0.33
Nodes (5): destino, PIEZAS, ROOT, sueltos, trozos

### Community 9 - "Community 9"
Cohesion: 0.33
Nodes (5): DESTINO, NUCLEO, ORIGEN, ROOT, soloComprueba

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (10): Al desplegar, Al empezar una sesión, Al terminar cualquier cambio, Cómo está repartido, Cómo se prueba, Decisiones que no son evidentes, Estilo, Si cambias una regla del juego (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.17
Nodes (18): cors(), cortesValidos(), db, diaValido(), entregar(), jugadorValido(), limpiarNombre(), ORIGENES (+10 more)

## Knowledge Gaps
- **57 isolated node(s):** `STAGES`, `L`, `savedTheme`, `SPANS`, `REMOTO` (+52 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `$()` connect `Community 0` to `Community 1`, `Community 2`, `Community 4`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `T()` connect `Community 0` to `Community 1`, `Community 2`, `Community 4`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `evaluate()` connect `Community 2` to `Community 1`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **What connects `STAGES`, `L`, `savedTheme` to the rest of the system?**
  _57 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08428446005267778 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.10304789550072568 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.10144927536231885 - nodes in this community are weakly interconnected._