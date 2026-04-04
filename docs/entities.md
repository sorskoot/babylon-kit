# Entities & Interaction

## GameObject

`GameObject` is the abstract base class for all interactive entities in a scene. It provides a lifecycle, mesh management, tags, and enable/disable support.

### Creating a custom GameObject

```ts
import { AbstractMesh, Scene } from "@babylonjs/core";
import { GameObject } from "../entities/GameObject";

export class Crate extends GameObject {
    constructor(name: string, scene: Scene, mesh?: AbstractMesh) {
        super(name, scene);
        if (mesh) this.mesh = mesh;
        this.addTag("prop");
    }

    public onStart(): void {
        // Called once after addGameObject()
    }

    public onUpdate(deltaTime: number): void {
        // Called every frame (seconds since last frame)
        if (this.mesh) {
            this.mesh.rotation.y += 0.5 * deltaTime;
        }
    }

    public onInteract(): void {
        // Called when the player clicks this object
        console.log("Crate opened!");
    }
}
```

### Lifecycle

| Method | When it runs |
|--------|-------------|
| `constructor` | Object creation — set up properties, assign mesh, add tags |
| `onStart()` | Called once by `GameScene.addGameObject()` |
| `onUpdate(dt)` | Called every frame for enabled objects (dt in seconds) |
| `onInteract()` | Called when the object is clicked (requires `InteractionManager`) |
| `dispose()` | Disposes the mesh and cleans up |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Identifier |
| `mesh` | `AbstractMesh \| null` | The visual mesh |
| `tags` | `Set<string>` | Tags for categorisation |
| `enabled` | `boolean` | When `false`, skips `onUpdate()` and hides the mesh |
| `position` | `Vector3` | Shortcut to `mesh.position` |

### Tags

```ts
enemy.addTag("enemy");
enemy.addTag("hostile");
enemy.hasTag("enemy"); // true

// Query by tag from the scene
const enemies = this.getGameObjectsByTag("enemy");
```

## Built-in Examples

### Enemy

A patrolling entity that takes damage on click.

```ts
const mesh = MeshBuilder.CreateSphere("goblin", { diameter: 1.5 }, scene);
mesh.position = new Vector3(-3, 0.75, 3);

const enemy = new Enemy("goblin", scene, mesh, { speed: 2, health: 100 });
this.addGameObject("goblin", enemy);
this.interactionManager.enableInteraction(enemy);
```

- Patrols back and forth along the X axis
- `onInteract()` deals 25 damage; flashes red
- Disables itself when health reaches 0
- `getHealth()` returns current health

### Pickup

A collectible item that spins and bobs.

```ts
const mesh = MeshBuilder.CreateBox("health", { size: 0.6 }, scene);
mesh.position = new Vector3(3, 1, 2);

const pickup = new Pickup("health", scene, mesh);
this.addGameObject("health", pickup);
this.interactionManager.enableInteraction(pickup);
```

- Rotates and bobs up/down automatically
- `onInteract()` collects it (disables the object)
- `isCollected()` returns whether it has been picked up

## InteractionManager

`InteractionManager` is created automatically by `GameScene`. It enables click-to-interact on GameObjects using BabylonJS `ActionManager`.

### Enable click interaction

```ts
this.interactionManager.enableInteraction(enemy);
```

When the player clicks the mesh, `enemy.onInteract()` is called.

### Enable by tag

```ts
this.interactionManager.enableInteractionByTag("enemy");
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
