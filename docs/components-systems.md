# Built-in Components & Systems

The engine ships with components and systems for loading meshes and materials
directly from URLs using Babylon.js, so you never have to write boilerplate
loader code yourself.

## Setup

Register the built-in systems once at startup:

```typescript
import {
    GameEngine,
    MeshLoaderSystem,
    MaterialLoaderSystem,
} from "@sorskoot/babylon-kit";

const game = new GameEngine();
await game.initialize();

game.registerSystem(new MeshLoaderSystem());   // priority -100
game.registerSystem(new MaterialLoaderSystem()); // priority -90

game.start();
```

Both systems run at negative priority so they execute before any gameplay
systems (priority 0+).

---

## MeshComponent

Attach to an entity to give it a 3-D mesh. There are two modes:

1. **URL mode** — provide a `url` and the `MeshLoaderSystem` will
   asynchronously load the mesh via Babylon's `SceneLoader`.
2. **Direct mesh mode** — pass an already-created Babylon.js `Mesh` (e.g.
   from `MeshBuilder`). The component is immediately in the `'loaded'` state
   and no async loading takes place.

### URL mode

```typescript
import { MeshComponent } from "@sorskoot/babylon-kit";

const helmet = game.createEntity("Helmet");
helmet.addComponent(new MeshComponent({
    url: "https://models.babylonjs.com/DamagedHelmet/DamagedHelmet.gltf",
    position: { x: 0, y: 1.5, z: 2 },
    scaling: 0.5,
}));
```

### Direct mesh mode

```typescript
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { MeshComponent } from "@sorskoot/babylon-kit";

const box = MeshBuilder.CreateBox("Box", { size: 0.25 }, game.scene);
const entity = game.createEntity("Box");
entity.addComponent(new MeshComponent({
    mesh: box,
    position: { x: 0, y: 1, z: 3 },
    scaling: 2,
}));
```

> **Note:** Supply either `url` *or* `mesh`, never both.

### Options (URL mode)

| Option | Type | Description |
|--------|------|-------------|
| `url` | `string` | **Required.** URL of the mesh file. |
| `rootUrl` | `string` | Root path prepended to the filename. Auto-derived from `url` if omitted. |
| `position` | `{ x, y, z }` | World position to place the mesh at after loading. |
| `rotation` | `{ x, y, z }` | Euler rotation in radians. |
| `scaling` | `number \| { x, y, z }` | Uniform or per-axis scale. |

### Options (direct mesh mode)

| Option | Type | Description |
|--------|------|-------------|
| `mesh` | `AbstractMesh` | **Required.** An existing Babylon.js mesh instance. |
| `position` | `{ x, y, z }` | World position to place the mesh at. |
| `rotation` | `{ x, y, z }` | Euler rotation in radians. |
| `scaling` | `number \| { x, y, z }` | Uniform or per-axis scale. |

### Properties (set by the system)

| Property | Type | Description |
|----------|------|-------------|
| `state` | `LoadState` | `'pending'` → `'loading'` → `'loaded'` or `'error'` |
| `rootNode` | `TransformNode` | The root transform created by the loader. |
| `meshes` | `AbstractMesh[]` | All meshes created by the loader. |
| `error` | `unknown` | Error object if loading failed. |

### Cleanup

When the component is removed (or the entity is destroyed), all loaded meshes
and the root node are automatically disposed.

### Runtime Transform Methods

After a mesh is loaded you can modify its transform at any time using the
following convenience methods. Changes are batched via a dirty flag and applied
on the next update tick.

#### Position

| Method | Description |
|--------|-------------|
| `setPosition(x, y, z)` | Set the position to absolute world-space coordinates. |
| `translate(x, y, z)` | Move the mesh by a delta relative to its current position. |

```typescript
const mc = entity.getComponent(MeshComponent)!;
mc.setPosition(0, 2, 5);   // teleport to (0, 2, 5)
mc.translate(1, 0, 0);     // shift 1 unit along X → now at (1, 2, 5)
```

#### Rotation

| Method | Description |
|--------|-------------|
| `setRotation(x, y, z)` | Set rotation to absolute Euler angles (radians). |
| `rotate(x, y, z)` | Increment the current rotation by the given Euler deltas. |

```typescript
mc.setRotation(0, Math.PI / 2, 0);  // face 90° around Y
mc.rotate(0, 0.01, 0);              // add a small Y rotation each frame
```

#### Scaling

| Method | Description |
|--------|-------------|
| `setScale(x, y, z)` | Set per-axis scaling, replacing any previous value. |
| `scale(x, y, z)` | Multiply the current scaling by per-axis factors. |

```typescript
mc.setScale(2, 2, 2);   // uniform scale ×2
mc.scale(1, 2, 1);      // double the Y axis → now (2, 4, 2)
```

---

## MaterialComponent

Attach alongside a `MeshComponent` to control the material applied to the
entity's meshes. Supports three modes:

| Mode | Description |
|------|-------------|
| `'standard'` | Create a `StandardMaterial` from colour / texture properties. |
| `'pbr'` | Create a `PBRMaterial` with metallic/roughness workflow. |
| `'url'` | Load a node-material JSON via `NodeMaterial.ParseFromFileAsync`. |

```typescript
import { MaterialComponent } from "@sorskoot/babylon-kit";

// Standard material
entity.addComponent(new MaterialComponent({
    mode: "standard",
    diffuseColor: { r: 1, g: 0, b: 0 },
}));

// PBR material with a texture
entity.addComponent(new MaterialComponent({
    mode: "pbr",
    diffuseColor: { r: 0.8, g: 0.6, b: 0.3 },
    diffuseTextureUrl: "assets/textures/crate_albedo.png",
    metallic: 0.1,
    roughness: 0.8,
}));

// Node material from URL
entity.addComponent(new MaterialComponent({
    mode: "url",
    url: "assets/materials/toon.json",
}));
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `MaterialMode` | `'standard'` (or `'url'` if `url` given) | How the material is created. |
| `url` | `string` | — | Node-material JSON URL (for `'url'` mode). |
| `diffuseColor` | `{ r, g, b }` | — | Diffuse / albedo colour. |
| `diffuseTextureUrl` | `string` | — | Diffuse / albedo texture URL. |
| `emissiveColor` | `{ r, g, b }` | — | Emissive colour. |
| `metallic` | `number` | — | PBR metallic (0–1). |
| `roughness` | `number` | — | PBR roughness (0–1). |

### Ordering

The `MaterialLoaderSystem` waits until the entity's `MeshComponent` reaches
`'loaded'` state before creating the material, so you can attach both
components at the same time without worrying about ordering.

### Cleanup

When the component is removed the material is automatically disposed.

---

## Load State

Both components expose a `state` property that follows this state machine:

```
pending → loading → loaded
                  ↘ error
```

You can react to loading in your own systems:

```typescript
class SpawnEffectSystem extends System {
    readonly name = "spawnEffect";
    private _engine!: IGameEngine;

    onRegister(engine: IGameEngine) { this._engine = engine; }

    update(): void {
        for (const entity of this._engine.entities) {
            const mc = entity.getComponent(MeshComponent);
            if (mc?.state === "loaded" && !entity.hasComponent(ReadyTag)) {
                entity.addComponent(new ReadyTag());
                console.log(`${entity.name} is ready!`);
            }
        }
    }
}
```

---

## Full Example

```typescript
import {
    GameEngine,
    MeshComponent,
    MaterialComponent,
    MeshLoaderSystem,
    MaterialLoaderSystem,
} from "@sorskoot/babylon-kit";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";

const game = new GameEngine({ debug: true });
await game.initialize();

game.registerSystem(new MeshLoaderSystem());
game.registerSystem(new MaterialLoaderSystem());

// A glTF model (uses its own embedded materials)
const helmet = game.createEntity("Helmet");
helmet.addComponent(new MeshComponent({
    url: "models/DamagedHelmet.gltf",
    position: { x: 0, y: 1.5, z: 2 },
    scaling: 0.5,
}));

// A procedural mesh created with MeshBuilder
const box = MeshBuilder.CreateBox("Box", { size: 0.25 }, game.scene);
const boxEntity = game.createEntity("Box");
boxEntity.addComponent(new MeshComponent({
    mesh: box,
    position: { x: 2, y: 0.5, z: 3 },
}));
boxEntity.addComponent(new MaterialComponent({
    mode: "standard",
    diffuseColor: { r: 0, g: 0.8, b: 0.2 },
}));

// A mesh with a custom PBR material
const crate = game.createEntity("Crate");
crate.addComponent(new MeshComponent({
    url: "models/crate.glb",
    position: { x: -2, y: 0.5, z: 3 },
}));
crate.addComponent(new MaterialComponent({
    mode: "pbr",
    diffuseColor: { r: 0.8, g: 0.6, b: 0.3 },
    metallic: 0.1,
    roughness: 0.8,
}));

game.start();
```

