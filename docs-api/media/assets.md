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

```ts
const model = await assetManager.loadModel(
    "floor_dirt",           // cache key
    "/assets/models/",      // root URL
    "floor.glb",            // file name
    scene                   // BabylonJS Scene
);

// model.meshes is an array of AbstractMesh
model.meshes.forEach(mesh => {
    mesh.position.x = 5;
});
```

Models are also cached by key. Subsequent calls with the same key skip the network request.

```ts
const cached = assetManager.getModel("floor_dirt"); // LoadedModel | undefined
```

### Disposal

```ts
assetManager.dispose(); // disposes all cached textures and models
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
