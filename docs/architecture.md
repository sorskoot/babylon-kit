# Architecture Overview

The framework is built around a small set of classes with clear responsibilities. The `Game` class is the single entry point that owns the BabylonJS `Engine` and all manager singletons.

## Class Diagram

```
Game
├── Engine (BabylonJS)
├── SceneManager
│   └── GameScene (abstract)
│       ├── Scene (BabylonJS)
│       ├── InteractionManager
│       ├── XRManager
│       └── Map<string, GameObject>
├── AssetManager
├── UIManager
└── ParticleManager
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
- An `InteractionManager` for click-to-interact
- An `XRManager` for WebXR
- An automatic update loop that calls `onUpdate()` on all enabled GameObjects every frame

You implement the `setup()` method to build your scene:

```ts
export class MyScene extends GameScene {
    public async setup(): Promise<void> {
        // Create cameras, lights, meshes, load assets, etc.
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
       └─ new ParticleManager()

  └─ new MyScene(engine, uiManager, assetManager, particleManager)
       └─ setup()
            ├─ create camera, lights, meshes
            ├─ assetManager.loadModel(...)
            ├─ uiManager.loadUI3D(...)
            ├─ particleManager.loadFromJSON(...)
            ├─ new Enemy(...) → addGameObject(...)
            └─ interactionManager.enableInteraction(...)

  └─ game.start()  →  render loop  →  activeScene.render()
                                         └─ update loop → gameObject.onUpdate(dt)
```

## Lifecycle

1. **Construction** — `Game` creates the engine and managers.
2. **Scene setup** — `addScene()` calls `scene.setup()` where you build the world.
3. **Render loop** — `game.start()` begins rendering the active scene every frame.
4. **Update loop** — Before each render, all enabled GameObjects receive `onUpdate(deltaTime)`.
5. **Disposal** — `game.dispose()` tears down all scenes, managers, and the engine.
