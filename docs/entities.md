# Entities & Interaction

## GameObject

`GameObject` is the abstract base class for all interactive entities in a scene. It provides a lifecycle, scene-node management, tags, and enable/disable support.

### Creating a custom GameObject

```ts
import { TransformNode } from "@babylonjs/core";
import { GameObject, GameScene } from "@sorskoot/babylon-kit";

export class Crate extends GameObject {
    constructor(name: string, scene: GameScene, mesh?: TransformNode) {
        super(name, scene);
        if (mesh) this.node = mesh;
        this.addTag("prop");
    }

    public onStart(): void {
        // Called once after addGameObject()
    }

    public onUpdate(deltaTime: number): void {
        // Called every frame (seconds since last frame)
        if (this.node) {
            this.node.rotation.y += 0.5 * deltaTime;
        }
    }

    public onInteract(source?: InputSource): void {
        // Called when the player interacts with this object.
        // source is "mouse", "keyboard", "gamepad", or "xr".
        console.log("Crate opened via", source);
    }
}
```

### Lifecycle

| Method | When it runs |
|--------|-------------|
| `constructor` | Object creation — set up properties, assign node, add tags |
| `onStart()` | Called once by `GameScene.addGameObject()` |
| `onUpdate(dt)` | Called every frame for enabled objects (dt in seconds) |
| `onInteract(source?)` | Called when the object is interacted with; `source` identifies the device (`"mouse"`, `"keyboard"`, `"gamepad"`, `"xr"`) |
| `dispose()` | Disposes the scene node and cleans up |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Identifier |
| `node` | `TransformNode \| null` | The underlying BabylonJS scene node |
| `tags` | `Set<string>` | Tags for categorisation |
| `enabled` | `boolean` | When `false`, skips `onUpdate()` and hides the node |
| `position` | `Vector3` | Shortcut to `node.position` |

### Tags

```ts
obj.addTag("enemy");
obj.addTag("hostile");
obj.hasTag("enemy"); // true

// Query by tag from the scene
const enemies = this.getGameObjectsByTag("enemy");
```

## Built-in GameObjects

The package ships with ready-to-use `GameObject` subclasses that are also
wired up automatically via the `SORSKOOT_BJS_ENGINE` GLTF extension when your
Blender model carries the matching metadata.

### DoorObject

An animated door that toggles open/closed on interaction.

```ts
import { DoorObject } from "@sorskoot/babylon-kit";

const doorObj = new DoorObject("frontDoor", this, doorMesh, {
    reversed: true,  // swing in negative direction
    locked: false,   // unlocked by default
    speed: 0.6,      // 600 ms animation
});
this.addGameObject("frontDoor", doorObj);
this.interactionManager.enableInteraction(doorObj);
```

Lock and unlock programmatically:

```ts
doorObj.lock();    // closes the door and prevents further interaction
doorObj.unlock();  // unlocks and resets the animator
```

### InspectObject

An object the player can pick up and examine in front of the camera.

Clicking the object moves it in front of the active camera (or the
XR controller grip in VR). The player can rotate it by dragging. Pressing
**Escape** or interacting again returns it to its original position.

```ts
import { InspectObject } from "@sorskoot/babylon-kit";

// Typically created automatically by GameScene via metadata, but can be
// instantiated directly:
const inspectable = new InspectObject("artifact", this, this.xrManager, artifactMesh);
this.addGameObject("artifact", inspectable);
this.interactionManager.enableInteraction(inspectable);
```

## InteractionManager

`InteractionManager` is created automatically by `GameScene`. It enables click-to-interact on GameObjects using BabylonJS `ActionManager`.

### Enable click interaction

```ts
this.interactionManager.enableInteraction(myObj);
```

When the player clicks the mesh, `myObj.onInteract()` is called.

### Enable by tag

```ts
this.interactionManager.enableInteractionByTag("prop");
```

Enables interaction on all currently registered GameObjects with the given tag.

### Raycasting pick

```ts
const hit = this.interactionManager.pick();
if (hit) {
    console.log("Picked:", hit.name);
}
```

Performs a raycast from the current pointer position and returns the first `GameObject` hit, or `null`.

### Routing keyboard, gamepad, and XR through InteractionManager

Use `bindPickAction` to make any named `InputManager` action trigger a pick and
call `onInteract(source)` on the hit object:

```ts
this.inputManager.bindAction("interact", {
    keys: [Key.F],
    gamepadButtons: [GamepadButton.A],
    xrTrigger: true,
});

this.interactionManager.bindPickAction(this.inputManager, "interact");
```

See [Input](./input.md) for the full `InputManager` documentation.
