# Graph Report - cuthalf  (2026-08-11)

## Corpus Check
- 42 files · ~26,390 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 267 nodes · 738 edges · 12 communities (10 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7c7ace40`
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

## God Nodes (most connected - your core abstractions)
1. `$()` - 52 edges
2. `T()` - 29 edges
3. `start()` - 14 edges
4. `paintOver()` - 13 edges
5. `paint()` - 13 edges
6. `applyLang()` - 12 edges
7. `paintScores()` - 11 edges
8. `worldRows()` - 11 edges
9. `enviarPartida()` - 11 edges
10. `goHome()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `partidaPerfecta()` --calls--> `bisector()`  [EXTRACTED]
  tools/test-core.mjs → supabase/functions/_shared/core/geometry.js
- `partidaPerfecta()` --calls--> `levelShape()`  [EXTRACTED]
  tools/test-core.mjs → supabase/functions/_shared/core/replay.js
- `partidaPerfecta()` --calls--> `mulberry32()`  [EXTRACTED]
  tools/test-core.mjs → supabase/functions/_shared/core/rng.js
- `partidaPerfecta()` --calls--> `setRNG()`  [EXTRACTED]
  tools/test-core.mjs → supabase/functions/_shared/core/rng.js
- `tutorStep()` --calls--> `normalize()`  [EXTRACTED]
  src/game.js → src/geometry.js

## Import Cycles
- None detected.

## Communities (12 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (56): finishTutor(), goHome(), startTutor(), tutorChrome(), tutorStep(), L, setLang(), T() (+48 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (40): CONFIG, STAGES, TUTOR, gameOver(), guardarMarca(), paintOver(), saveMark(), start() (+32 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (35): levelConfig(), advance(), doCut(), newLevel(), timeUp(), area(), bisector(), centroid() (+27 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (22): BOARDS, boardTime(), isBoard(), dayTimer(), hashStr(), cors(), cortesValidos(), db (+14 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (22): CONFIG, levelConfig(), STAGES, TUTOR, area(), bisector(), centroid(), clipHalf() (+14 more)

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (12): 1 · Las cinco clasificaciones, 2 · En el aparato · `localStorage`, 3 · En el servidor · Supabase, 4 · Cómo se comprueba que una marca es real, 5 · Dominio, 6 · Limpieza, CUTHALF · datos y clasificaciones, Cómo se leen (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.25
Nodes (6): fallos, navegador, NAVEGADORES, RESULTADO, ROOT, servidor

### Community 7 - "Community 7"
Cohesion: 0.29
Nodes (6): Al desplegar, CUTHALF, Cómo está repartido, En marcha, Prueba, Si cambias una regla del juego

### Community 8 - "Community 8"
Cohesion: 0.33
Nodes (5): destino, PIEZAS, ROOT, sueltos, trozos

### Community 9 - "Community 9"
Cohesion: 0.33
Nodes (5): DESTINO, NUCLEO, ORIGEN, ROOT, soloComprueba

## Knowledge Gaps
- **46 isolated node(s):** `STAGES`, `L`, `savedTheme`, `REMOTO`, `cv` (+41 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `$()` connect `Community 0` to `Community 1`, `Community 2`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `T()` connect `Community 0` to `Community 1`, `Community 2`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `evaluate()` connect `Community 2` to `Community 1`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `STAGES`, `L`, `savedTheme` to the rest of the system?**
  _46 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08960573476702509 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11707317073170732 - nodes in this community are weakly interconnected._