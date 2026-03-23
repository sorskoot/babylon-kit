# Scene Management

Stack-based scene management with load/push/pop operations and async setup/teardown.

## Setup

```typescript
import { SceneManager } from "./src/engine";
import type { SceneDescriptor } from "./src/engine/core/types";

const scenes = new SceneManager();
scenes.init(game);
```

## Defining Scenes

Scenes add and remove meshes / entities from the engine's managed Babylon.js
scene. There is no need to create separate `Scene` instances.

```typescript
const menuScene: SceneDescriptor = {
    name: "menu",
    async setup(engine) {
        const scene = engine.scene!;
        // Add meshes, register entities and components
        MeshBuilder.CreateSphere("menuSphere", { diameter: 2 }, scene);
    },
    async teardown(engine) {
        const scene = engine.scene!;
        // Remove scene-specific meshes
        scene.getMeshByName("menuSphere")?.dispose();
    },
};

scenes.register(menuScene);
scenes.register(gameScene);
```

## Loading Scenes

Replace the entire stack:

```typescript
await scenes.load("menu");  // tears down current, sets up menu
await scenes.load("game");  // tears down menu, sets up game
```

## Scene Stack (Push/Pop)

Layer scenes for pause menus, overlays, etc.:

```typescript
await scenes.push("game");
await scenes.push("pauseMenu");  // game stays in stack

scenes.stackDepth;     // 2
scenes.currentScene;   // pauseMenu descriptor

await scenes.pop();    // tears down pauseMenu, re-enters game
```

When popping, `teardown` is called on the top scene, then `setup` is called again on the new top.

## Properties

```typescript
scenes.currentScene;  // top of stack (or undefined)
scenes.stackDepth;    // number of scenes in stack
```

## Unregistering

```typescript
scenes.unregister("menu");
```
