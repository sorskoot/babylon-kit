# AGENTS.md — AI Agent Guide for BJS-GameEngine

## Project Overview
`@sorskoot/babylon-kit` is a lightweight ECS game engine layer on top of [Babylon.js](https://www.babylonjs.com/). It provides game engine plumbing (entities, systems, services, game loop) so consumers only write components and systems.

## Key Commands
```bash
npm run build          # clean + tsc (outputs to dist/)
npm run build:watch    # incremental watch build
npm run docs           # typedoc → docs-api/
npm run lint           # eslint src/
```
Tests live in `tests/**/*.test.ts` (not in `src/`). There are currently no tests written; create new ones under `tests/`.

## Architecture at a Glance
```
src/engine/
  core/        — Engine, GameLoop, Entity, Component, System, types (all interfaces live here)
  components/  — Built-in data-only components (MeshComponent, MaterialComponent)
  systems/     — Built-in systems that drive those components (MeshLoaderSystem, MaterialLoaderSystem)
  services/    — Stateful singletons: input/, assets/, audio/, physics/, scenes/
  debug/       — DebugOverlay (DOM FPS stats) + EntityListServiceDefinition (Babylon Inspector panel)
```
All public exports flow through `src/engine/index.ts`. Add new exports there when adding public API.

## ECS Patterns
- **Components** extend `Component` (from `core/component.ts`) — **data only**. Use lifecycle hooks `onAdd`, `onRemove`, `onUpdate`, `onEnable`, `onDisable`.
- **Systems** extend `System` (from `core/system.ts`) — implement `readonly name`, `update(delta)`. Access entities via `this._engine.entities` acquired in `onRegister(engine)`. Use `entity.getComponent(MyComp)` for type-safe lookups.
- **Priority**: lower numbers run first. `MeshLoaderSystem` uses `-100` to run before everything else.
- Components are keyed by **class name** — only one instance of each component class per entity is allowed.
- Entity IDs are auto-incrementing integers. Use `resetEntityIdCounter()` (exported for tests) to reset between test runs.

## GameEngine Bootstrap Flow
1. `new GameEngine(config?)` — merges with defaults (antialias, 60fps, WebXR enabled, default camera+light).
2. `await engine.initialize()` — creates canvas, Babylon.js `Engine`, `Scene`, default `FreeCamera` at `(0,1.6,-3)`, `HemisphericLight`, WebXR (gracefully degrades), and auto-registers `MeshLoaderSystem` + `MaterialLoaderSystem`.
3. `engine.registerSystem(new MySystem())`.
4. `engine.start()` — starts the render loop.

Canvas resolution order: `config.canvas` → existing DOM element by `config.canvasId` (default `"renderCanvas"`) → newly created full-viewport canvas appended to `body`.

## Service Layer (Dependency Injection)
Services are plain classes registered on `GameEngine` via `engine.registerService(key, instance)` and retrieved with `engine.getService<T>(key)`. Services are **not** auto-registered (except `InputSystem` which is internal). Register `SceneManager`, `AssetManager`, `AudioManager`, `PhysicsService` manually and pass `engine` to their `init()` methods.

## MeshComponent Loading States
`MeshComponent` uses a `LoadState`: `'pending' → 'loading' → 'loaded' | 'error'`. `MeshLoaderSystem` polls entities each frame and processes `pending` components. In **direct mesh mode** (provide `mesh:` not `url:`), the component starts `'loaded'` and no async work occurs.

## Debug Shortcuts (when `debug: true`)
- `Ctrl+Alt+I` — toggle Babylon.js Inspector (includes custom Entity List panel).
- `Ctrl+Alt+F` — toggle FPS/stats overlay (DOM element, top-left).

## Path Aliases
Both `tsconfig.json` and `vitest.config.ts` define:
- `@engine` → `src/engine`
- `@game` → `src/game`

Use `@engine/...` for imports within `src/` and test files.

## TypeScript Strictness
`strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch` are all enabled. Every parameter must be used or prefixed with `_`. Target is `ES2024`, `moduleResolution: "bundler"`.

## Key Files for Reference
| File | Purpose |
|------|---------|
| `src/engine/core/types.ts` | All interfaces (`IGameEngine`, `IEntity`, `ISystem`, `IComponent`, `EngineConfig`, etc.) |
| `src/engine/core/engine.ts` | Full engine implementation — start here for any engine-level change |
| `src/engine/core/loop.ts` | Fixed-step accumulator game loop driven by Babylon's `runRenderLoop` |
| `samples/ecs-demo/ecs-demo.ts` | Canonical example of components + systems + `onRegister` pattern |
| `src/engine/index.ts` | Public API barrel — add new exports here |

