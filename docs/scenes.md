# Scene Management

## GameScene

`GameScene` is the abstract base class for all scenes. Extend it, call `super(engine, game)` in the constructor, and implement `setup()`:

```ts
import { FreeCamera, HemisphericLight, MeshBuilder, Vector3 } from "@babylonjs/core";
import { GameScene } from "@sorskoot/babylon-kit";

export class LevelScene extends GameScene {
    constructor(engine: Engine, game: Game) {
        super(engine, game);
    }

    public async setup(): Promise<void> {
        const camera = new FreeCamera("cam", new Vector3(0, 5, -10), this.scene);
        camera.setTarget(Vector3.Zero());
        camera.attachControl(true);

        new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
        MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, this.scene);
    }
}
```

### What GameScene gives you

| Property / Method | Description |
|-------------------|-------------|
| `this.scene` | The BabylonJS `Scene` instance |
| `this.engine` | The BabylonJS `Engine` |
| `this.game` | The owning `Game` instance; gives access to all shared managers |
| `this.inputManager` | Unified keyboard/mouse/gamepad/XR input (see [Input](./input.md)) |
| `this.interactionManager` | Click-to-interact system (see [Entities & Interaction](./entities.md)) |
| `this.xrManager` | WebXR manager (see [WebXR](./webxr.md)) |
| `addGameObject(key, obj)` | Register a `GameObject`; calls `onStart()` automatically |
| `getGameObject(key)` | Retrieve a registered `GameObject` by key |
| `getGameObjectsByTag(tag)` | Get all GameObjects with a specific tag |
| `removeGameObject(key)` | Remove and dispose a `GameObject` |
| `initializeXR(options?)` | Convenience method to start WebXR |

### Accessing shared managers

All shared managers are accessed through `this.game`:

```ts
public async setup(): Promise<void> {
    // Load a model through the shared AssetManager
    await this.game.assetManager.loadModel("floor", "/assets/models/", "floor.glb", this.scene);

    // Play background music
    await this.game.audioManager.loadMusic("theme", "/audio/theme.ogg");
    this.game.audioManager.playMusic("theme");

    // Load a particle system
    await this.game.particleManager.loadFromJSON("fire", "/assets/particles/fire.json", this.scene, {
        position: new Vector3(0, 0, 3),
    });
}
```

### Custom update logic

Override `update()` to add scene-level logic that runs every frame:

```ts
protected update(deltaTime: number): void {
    // your per-frame logic here
}
```

## SceneManager

`SceneManager` is a registry of named scenes. It is created automatically by `Game`.

### Adding scenes

```ts
const level = new LevelScene(game.getEngine(), game);
await game.sceneManager.addScene("level1", level);
```

`addScene()` calls `setup()` on the scene, so by the time it resolves the scene is fully built.

### Switching scenes

```ts
await game.sceneManager.switchTo("level1");
```

Only one scene is active at a time. The active scene is the one rendered in the game loop.

### Removing scenes

```ts
game.sceneManager.removeScene("level1");
```

This disposes the scene and all its GameObjects. If the removed scene was active, no scene will be rendered until you switch to another one.

### Accessing the active scene

```ts
const babylonScene = game.sceneManager.getActiveScene();   // BabylonJS Scene
const gameScene = game.sceneManager.getActiveGameScene();   // GameScene subclass
```
