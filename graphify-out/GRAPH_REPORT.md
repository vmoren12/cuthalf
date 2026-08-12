# Graph Report - cuthalf  (2026-08-12)

## Corpus Check
- 44 files · ~33,173 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 286 nodes · 782 edges · 14 communities (12 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bea0c77a`
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
1. `$()` - 53 edges
2. `T()` - 31 edges
3. `paintOver()` - 16 edges
4. `start()` - 14 edges
5. `paint()` - 13 edges
6. `paintScores()` - 12 edges
7. `applyLang()` - 12 edges
8. `enviarPartida()` - 12 edges
9. `worldRows()` - 11 edges
10. `drawBest()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `partidaPerfecta()` --calls--> `bisector()`  [EXTRACTED]
  tools/test-core.mjs → supabase/functions/_shared/core/geometry.js
- `partidaPerfecta()` --calls--> `levelShape()`  [EXTRACTED]
  tools/test-core.mjs → supabase/functions/_shared/core/replay.js
- `partidaPerfecta()` --calls--> `mulberry32()`  [EXTRACTED]
  tools/test-core.mjs → supabase/functions/_shared/core/rng.js
- `partidaPerfecta()` --calls--> `setRNG()`  [EXTRACTED]
  tools/test-core.mjs → supabase/functions/_shared/core/rng.js
- `newLevel()` --calls--> `normalize()`  [EXTRACTED]
  src/game.js → src/geometry.js

## Import Cycles
- None detected.

## Communities (14 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (56): finishTutor(), goHome(), startTutor(), tutorChrome(), tutorStep(), L, setLang(), T() (+48 more)

### Community 1 - "Community 1"
Cohesion: 0.15
Nodes (27): CONFIG, STAGES, TUTOR, gameOver(), guardarMarca(), paintOver(), saveMark(), subirPartida() (+19 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (25): advance(), doCut(), timeUp(), area(), bisector(), centroid(), clipHalf(), evaluate() (+17 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (46): CONFIG, levelConfig(), STAGES, TUTOR, area(), bisector(), centroid(), clipHalf() (+38 more)

### Community 4 - "Community 4"
Cohesion: 0.22
Nodes (18): hayRemoto(), meDaily(), meFree(), NET, pedir(), REMOTO, rpc(), runStart() (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (12): 1 · Las cinco clasificaciones, 2 · En el aparato · `localStorage`, 3 · En el servidor · Supabase, 4 · Cómo se comprueba que una marca es real, 5 · Dominio, 6 · Limpieza, Cómo se leen, `free_best` y `daily_best` — lo que se consulta (+4 more)

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
Cohesion: 0.30
Nodes (11): levelConfig(), newLevel(), start(), levelShape(), replay(), mulberry32(), pick(), rnd() (+3 more)

## Knowledge Gaps
- **55 isolated node(s):** `STAGES`, `L`, `savedTheme`, `REMOTO`, `cv` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `$()` connect `Community 0` to `Community 1`, `Community 2`, `Community 4`, `Community 13`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `T()` connect `Community 0` to `Community 1`, `Community 2`, `Community 4`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `evaluate()` connect `Community 2` to `Community 1`, `Community 13`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **What connects `STAGES`, `L`, `savedTheme` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09114183307731695 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.14603174603174604 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.06892010535557506 - nodes in this community are weakly interconnected._