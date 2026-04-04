# Getting Started

This guide walks you through bootstrapping a project with the game framework and rendering your first scene.

## Prerequisites

- Node.js (v18+)
- npm

## Installation

The project uses [Vite](https://vitejs.dev/) as the dev server and bundler. Install dependencies:

```bash
npm install
```

Key packages:

| Package | Purpose |
|---------|---------|
| `@babylonjs/core` | Engine, scenes, meshes, materials, cameras, lights |
| `@babylonjs/gui` | 2D / 3D user-interface controls |
| `@babylonjs/loaders` | glTF / .glb file loading |

## Project Structure

```
src/
├── core/
│   ├── Game.ts              # Main entry point — owns engine & managers
│   ├── SceneManager.ts      # Named scene registry with switching
│   ├── GameScene.ts         # Abstract base class for scenes
│   ├── AssetManager.ts      # Texture & model caching
│   ├── InteractionManager.ts# Click-to-interact & raycasting
│   ├── ParticleManager.ts   # Persistent & one-shot particle systems
│   ├── SceneLoader.ts       # Load full .glb scenes from Blender
│   └── XRManager.ts         # WebXR session & controller management
├── entities/
│   ├── GameObject.ts        # Abstract entity base class
│   ├── Enemy.ts             # Example: patrolling enemy
│   └── Pickup.ts            # Example: collectible item
├── scenes/
│   └── MainScene.ts         # Example concrete scene
├── ui/
│   └── UIManager.ts         # 2D overlay & 3D in-world UI
└── main.ts                  # Application bootstrap
public/
└── assets/
    ├── models/              # .glb model files
    ├── particles/           # Particle system JSON files
    └── ui/                  # GUI Editor JSON files
```

## Minimal Example

### 1. Set up the HTML canvas

```html
<!-- index.html -->
<canvas id="gameCanvas" style="width:100%;height:100%;"></canvas>
<script type="module" src="/src/main.ts"></script>
```

### 2. Create a scene

```ts
// src/scenes/MyScene.ts
import { FreeCamera, HemisphericLight, MeshBuilder, Vector3 } from "@babylonjs/core";
import { GameScene } from "../core/GameScene";

export class MyScene extends GameScene {
    public async setup(): Promise<void> {
        const camera = new FreeCamera("cam", new Vector3(0, 5, -10), this.scene);
        camera.setTarget(Vector3.Zero());
        camera.attachControl(true);

        new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);

        MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, this.scene);
    }
}
```

### 3. Bootstrap the game

```ts
// src/main.ts
import { Game } from "./core/Game";
import { MyScene } from "./scenes/MyScene";

async function init() {
    const game = new Game("gameCanvas");

    const scene = new MyScene(game.getEngine());
    await game.sceneManager.addScene("main", scene);
    await game.sceneManager.switchTo("main");

    game.start();
}

init();
```

### 4. Run

```bash
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`). You should see a ground plane with a free camera.

## Next Steps

- [Architecture Overview](./architecture.md) — how the classes fit together
- [Scene Management](./scenes.md) — creating and switching scenes
- [Assets](./assets.md) — loading models, textures, and full Blender scenes
- [Entities & Interaction](./entities.md) — GameObjects, enemies, pickups, click interaction
- [UI](./ui.md) — fullscreen overlays and 3D in-world panels
- [Particles](./particles.md) — persistent systems and one-shot effects
- [WebXR](./webxr.md) — VR support and controller input
