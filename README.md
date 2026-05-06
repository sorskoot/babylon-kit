# @sorskoot/babylon-kit

A lightweight, modular game engine layer built on top of [Babylon.js](https://www.babylonjs.com/). Provides the scaffolding you need — game loop, scene management, asset loading, UI, particles, animations, interactions, and WebXR — so you can focus on building games.

## Installation

Install the package and its peer dependencies:

```bash
npm install @sorskoot/babylon-kit
npm install @babylonjs/core @babylonjs/gui @babylonjs/loaders
```

## Quick Start

```typescript
import { Game, GameScene, GameObject } from "@sorskoot/babylon-kit";
import { ArcRotateCamera, HemisphericLight, Vector3 } from "@babylonjs/core";

// 1. Create a scene by extending GameScene
class MainScene extends GameScene {
    async setup() {
        new ArcRotateCamera("cam", -Math.PI / 2, Math.PI / 4, 10, Vector3.Zero(), this.scene);
        new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
        // Add game objects, load models, set up XR …
    }
}

// 2. Boot the game
const game = new Game("renderCanvas");
await game.sceneManager.addScene("main", new MainScene(game.sceneManager.getEngine(), game));
await game.sceneManager.switchTo("main");
game.start(); // starts the render loop
```

## Architecture

```
src/engine/
  Game.ts               — Root entry point; owns the engine and all managers
  GameScene.ts          — Abstract base class for scenes (setup, update loop, GameObjects)
  GameObject.ts         — Abstract base class for interactive scene entities
  SceneManager.ts       — Registers, switches, and disposes GameScene instances
  AssetManager.ts       — Async model/texture loading, GPU instancing, thin instances
  AnimationManager.ts   — GLB animation groups, property tweens, shader transitions
  ParticleManager.ts    — Persistent and one-shot particle systems (JSON-based)
  UIManager.ts          — Fullscreen 2D overlay and in-world 3D GUI panels
  InteractionManager.ts — Pointer/click interactions wired to GameObjects
  XRManager.ts          — WebXR session lifecycle, movement, and controller events
  SceneLoader.ts        — Loads full .glb scene files and maps meshes to GameObjects
  MetadataRepository.ts — Runtime index of Sorskoot GLTF node metadata
  extensions/
    sorskoot-gltf-extension.ts — Custom GLTF2 loader extension (SORSKOOT_BJS_ENGINE)
```

### `Game`

The top-level class. Create one instance per page. It owns:

| Property | Type | Description |
|---|---|---|
| `sceneManager` | `SceneManager` | Register and switch between `GameScene`s |
| `assetManager` | `AssetManager` | Load and cache models and textures |
| `uiManager` | `UIManager` | Create 2D overlay and 3D GUI panels |
| `particleManager` | `ParticleManager` | Load and spawn particle systems |
| `animationManager` | `AnimationManager` | Drive GLB animations, tweens, and shader transitions |

### `GameScene`

Subclass `GameScene` and implement `setup()` to build your scene. Every registered `GameObject` is updated automatically each frame. The scene also provides built-in access to an `InteractionManager` and an `XRManager`.

```typescript
class LevelOne extends GameScene {
    async setup() {
        // build cameras, lights, load models, register game objects …
        const entries = await game.assetManager.loadModel("world", "/assets", "level1.glb", this.scene);
        game.assetManager.instantiate("world");

        this.addGameObject("player", new Player(this.scene));

        // Optional: enable WebXR with teleportation
        await this.initializeXR({
            movement: { mode: "teleportation", floorMeshes: [ground] },
        });
    }
}
```

### `GameObject`

Subclass `GameObject` to create interactive entities. Implement `onStart()` and `onUpdate(deltaTime)`.

```typescript
class Crate extends GameObject {
    onStart() {
        this.addTag("prop");
    }
    onUpdate(dt: number) {
        if (this.node) this.node.rotation.y += dt;
    }
}
```

## Building & Development

```bash
npm run dev          # start Vite dev server
npm run build        # compile TypeScript to dist/
npm run docs         # generate TypeDoc API docs
```

## GLTF Metadata (Blender add-on)

The engine ships a custom GLTF2 loader extension (`SORSKOOT_BJS_ENGINE`) that reads per-node metadata exported by the Blender add-on (`blender/sorskootengine.py`). Node metadata is available at runtime via `mesh.metadata.sorskoot` and indexed in the singleton `metadataRepository`.

Supported metadata groups:

| Group | Purpose |
|---|---|
| `generic` | Unique ID and comma-separated tags |
| `spawner` | Enemy type, count, and spawn radius |
| `particles` | Reference to a particle definition file |

## License

MIT
