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
├── engine/
│   ├── Game.ts              # Main entry point — owns engine & managers
│   ├── SceneManager.ts      # Named scene registry with switching
│   ├── GameScene.ts         # Abstract base class for scenes
│   ├── AssetManager.ts      # Texture & model caching
│   ├── AnimationManager.ts  # GLB animations, tweens, shader transitions
│   ├── AudioManager.ts      # Music & SFX management
│   ├── InputManager.ts      # Unified keyboard/mouse/gamepad/XR input
│   ├── InteractionManager.ts# Click-to-interact & raycasting
│   ├── ParticleManager.ts   # Persistent & one-shot particle systems
│   ├── SceneLoader.ts       # Load full .glb scenes from Blender
│   ├── SystemBase.ts        # Base class for custom game systems
│   ├── UIManager.ts         # 2D overlay & 3D in-world UI
│   └── XRManager.ts         # WebXR session & controller management
├── entities/
│   ├── DoorObject.ts        # Built-in: interactive animated door
│   └── InspectObject.ts     # Built-in: inspectable object (pick up & examine)
├── controllers/
│   └── DoorAnimationController.ts  # Tween-based open/close animator
├── utils/
│   ├── Mathf.ts             # Math utilities (clamp, lerp, vectors …)
│   └── rng.ts               # Seeded pseudo-random number generator
└── index.ts                 # Public package entry-point
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
import { Engine, FreeCamera, HemisphericLight, MeshBuilder, Vector3 } from "@babylonjs/core";
import { Game, GameScene } from "@sorskoot/babylon-kit";

export class MyScene extends GameScene {
    constructor(engine: Engine, game: Game) {
        super(engine, game);
    }

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
import { Game } from "@sorskoot/babylon-kit";
import { MyScene } from "./scenes/MyScene";

async function init() {
    const game = new Game("gameCanvas");

    const scene = new MyScene(game.getEngine(), game);
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
- [Entities & Interaction](./entities.md) — GameObjects, click interaction
- [Input](./input.md) — keyboard, mouse, gamepad, and XR controller input via named actions
- [UI](./ui.md) — fullscreen overlays and 3D in-world panels
- [Particles](./particles.md) — persistent systems and one-shot effects
- [Animations](./animations.md) — GLB animations, tweens, shader transitions
- [Audio](./audio.md) — music and sound effects
- [WebXR](./webxr.md) — VR support and controller input
- [Systems](./systems.md) — engine-wide per-frame subsystems
