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

Attach to an entity to load a 3-D mesh from a URL (glTF, glb, obj, etc.).

```typescript
import { MeshComponent } from "@sorskoot/babylon-kit";

const helmet = game.createEntity("Helmet");
helmet.addComponent(new MeshComponent({
    url: "https://models.babylonjs.com/DamagedHelmet/DamagedHelmet.gltf",
    position: { x: 0, y: 1.5, z: 2 },
    scaling: 0.5,
}));
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `url` | `string` | **Required.** URL of the mesh file. |
| `rootUrl` | `string` | Root path prepended to the filename. Auto-derived from `url` if omitted. |
| `position` | `{ x, y, z }` | World position to place the mesh at after loading. |
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

