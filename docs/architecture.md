# Architecture Overview

The framework is built around a small set of classes with clear responsibilities. The `Game` class is the single entry point that owns the BabylonJS `Engine` and all manager singletons.

## Class Diagram

```
Game
├── Engine (BabylonJS)
├── SceneManager
│   └── GameScene (abstract)
│       ├── Scene (BabylonJS)
│       ├── InputManager
│       ├── InteractionManager
│       ├── XRManager
│       └── Map<string, GameObject>
├── AssetManager
├── UIManager
├── ParticleManager
├── AnimationManager
├── AudioManager
└── Systems
    └── SystemBase (abstract, user-defined)
```

## Game

The root object. Created with a canvas element ID.

```ts
const game = new Game("gameCanvas");
```

**Owns:**

| Property | Type | Description |
|----------|------|-------------|
| `sceneManager` | `SceneManager` | Add, switch, and remove scenes |
| `assetManager` | `AssetManager` | Load and cache textures & models |
| `uiManager` | `UIManager` | Fullscreen 2D and 3D in-world UI |
| `particleManager` | `ParticleManager` | Persistent and one-shot particle systems |
| `animationManager` | `AnimationManager` | GLB animations, tweens, and shader transitions |
| `audioManager` | `AudioManager` | Music tracks and sound effects |
| `systems` | `Systems` | Registry for custom `SystemBase` subsystems |

**Methods:**

| Method | Description |
|--------|-------------|
| `getEngine()` | Returns the BabylonJS `Engine` |
| `getCanvas()` | Returns the `HTMLCanvasElement` |
| `start()` | Starts the render loop |
| `dispose()` | Tears down everything |

## GameScene (abstract)

Each scene you create extends `GameScene`. It provides:

- A BabylonJS `Scene` instance (`this.scene`)
- A `Map<string, GameObject>` for entity management
- An `InputManager` for unified keyboard/mouse/gamepad/XR input (`this.inputManager`)
- An `InteractionManager` for click-to-interact (`this.interactionManager`)
- An `XRManager` for WebXR (`this.xrManager`)
- Access to all shared managers via `this.game`
- An automatic update loop that calls `onUpdate()` on all enabled GameObjects every frame

You implement the `setup()` method to build your scene:

```ts
export class MyScene extends GameScene {
    constructor(engine: Engine, game: Game) {
        super(engine, game);
    }

    public async setup(): Promise<void> {
        // Create cameras, lights, meshes, load assets, etc.
        await this.game.assetManager.loadModel("level", "/assets/models/", "level.glb", this.scene);
    }
}
```

## SceneManager

Manages named scenes. Scenes are registered with a string key and can be switched at any time:

```ts
await game.sceneManager.addScene("menu", menuScene);   // calls setup()
await game.sceneManager.addScene("level1", levelScene);
await game.sceneManager.switchTo("level1");
```

Only one scene is active (rendered) at a time. Removing a scene disposes it.

## Data Flow

```
main.ts
  └─ new Game("gameCanvas")
       ├─ new SceneManager(engine)
       ├─ new AssetManager()
       ├─ new UIManager()
       ├─ new ParticleManager()
       ├─ new AnimationManager()
       ├─ new AudioManager()
       └─ new Systems()

  └─ new MyScene(engine, game)
       └─ setup()
            ├─ create camera, lights, meshes
            ├─ this.game.assetManager.loadModel(...)
            ├─ this.game.uiManager.loadUI3D(...)
            ├─ this.game.particleManager.loadFromJSON(...)
            ├─ this.game.audioManager.loadMusic(...)
            ├─ new DoorObject(...) → addGameObject(...)
            └─ interactionManager.enableInteraction(...)

  └─ game.start()  →  render loop  →  activeScene.render()
                                         └─ update loop → gameObject.onUpdate(dt)
                                                        → systems.update(dt)
```

## Lifecycle

1. **Construction** — `Game` creates the engine and managers.
2. **Scene setup** — `addScene()` calls `scene.setup()` where you build the world.
3. **Render loop** — `game.start()` begins rendering the active scene every frame.
4. **Update loop** — Before each render, all enabled GameObjects receive `onUpdate(deltaTime)`, then custom systems are ticked.
5. **Disposal** — `game.dispose()` tears down all scenes, managers, and the engine.
