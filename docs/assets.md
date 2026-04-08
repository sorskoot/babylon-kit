# Assets

## File Layout

Place asset files under `public/assets/`. Vite serves the `public/` directory at the root, so `public/assets/models/floor.glb` is available at `/assets/models/floor.glb` at runtime.

```
public/
└── assets/
    ├── models/       # .glb / .gltf files
    ├── particles/    # Particle system JSON
    └── ui/           # GUI Editor JSON
```

## AssetManager

`AssetManager` handles loading and caching textures and models. It is created automatically by `Game` and available as `game.assetManager`.

### Loading textures

```ts
const texture = assetManager.loadTexture("grass", "/assets/textures/grass.png", scene);
```

Textures are cached by key — calling `loadTexture` with the same key returns the cached instance.

```ts
const cached = assetManager.getTexture("grass"); // Texture | undefined
```

### Loading models (.glb / .gltf)

`loadModel` loads a model into an `AssetContainer` **without** adding it to the scene. This lets you inspect or clone the model before it becomes visible.

```ts
const container = await assetManager.loadModel(
    "floor_dirt",           // cache key
    "/assets/models/",      // root URL
    "floor.glb",            // file name
    scene                   // BabylonJS Scene
);

// Add all meshes / materials / etc. to the scene in one call
container.addAllToScene();
```

Models are cached by key. Subsequent calls with the same key skip the network request.

```ts
const cached = assetManager.getModel("floor_dirt"); // AssetContainer | undefined
```

### Instantiating (cloning) models

Once a model is loaded you can create multiple independent clones with `instantiate`. Each clone is a full deep copy (not a GPU instance), so metadata, hierarchy and skeletons are preserved.

```ts
// Load once — nothing is added to the scene yet
await assetManager.loadModel("car", "/assets/models/", "car.glb", scene);

// Spawn 3 clones at different positions
const positions = [new Vector3(0, 0, 0), new Vector3(5, 0, 0), new Vector3(10, 0, 0)];
for (let i = 0; i < 3; i++) {
    const entries = assetManager.instantiate("car", `car_${i}`);
    // entries.rootNodes — cloned root nodes (already in the scene)
    entries.rootNodes[0].position = positions[i];
}
```

The optional second argument is a name prefix applied to every cloned node (`car_0_Body`, `car_0_Wheel`, …).

### Finding nodes by Sorskoot metadata ID

If your Blender model uses the Sorskoot add-on to tag nodes with a `generic.id`, you can look up a specific node inside an instantiated clone with `AssetManager.findByMetadataId`:

```ts
const entries = assetManager.instantiate("car", `car_0`);
const racer = AssetManager.findByMetadataId(entries, "racer"); // TransformNode | null
```

This recursively searches the cloned hierarchy and returns the first node whose `metadata.sorskoot.generic.id` matches.

### Disposal

```ts
assetManager.dispose(); // disposes all cached textures, containers and tracked instances
```

## SceneFileLoader

For loading entire scenes exported from Blender (or any DCC tool) as a single `.glb` file, use `SceneFileLoader`.

### Basic load

```ts
import { SceneFileLoader } from "../core/SceneLoader";

const result = await SceneFileLoader.load("/assets/models/", "my_level.glb", scene);
// result.meshes      — all imported meshes
// result.rootNodes   — all imported transform nodes
```

### Load with factory (auto-create GameObjects)

Name your Blender objects with prefixes like `enemy_goblin`, `pickup_health`, `prop_barrel`. The factory function receives each mesh name and decides what `GameObject` to create:

```ts
import { SceneFileLoader } from "../core/SceneLoader";
import { Enemy } from "../entities/Enemy";
import { Pickup } from "../entities/Pickup";

const { meshes, gameObjects } = await SceneFileLoader.loadWithFactory(
    "/assets/models/",
    "my_level.glb",
    scene,
    (name, mesh, scene) => {
        if (name.startsWith("enemy_"))  return new Enemy(name, scene, mesh);
        if (name.startsWith("pickup_")) return new Pickup(name, scene, mesh);
        return null; // static scenery — no GameObject needed
    }
);

// Register the created GameObjects in the scene
for (const [key, obj] of gameObjects) {
    this.addGameObject(key, obj);
}
```

The `__root__` mesh (BabylonJS import root) is automatically skipped.

## Blender Workflow

1. Build your scene in Blender.
2. Name objects with meaningful prefixes (`enemy_`, `pickup_`, `prop_`, etc.).
3. Export as **glTF Binary (.glb)**.
4. Place the file in `public/assets/models/`.
5. Use `SceneFileLoader.loadWithFactory()` with a factory that maps prefixes to `GameObject` subclasses.
