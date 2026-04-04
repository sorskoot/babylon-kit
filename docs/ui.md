# UI

`UIManager` supports two modes: a **fullscreen 2D overlay** (HUD) and **3D in-world panels** loaded from JSON files created with the BabylonJS GUI Editor.

## Fullscreen 2D UI

Create a standard BabylonJS fullscreen GUI overlay:

```ts
const adt = uiManager.createFullscreenUI("hud", scene);
```

### Adding text

```ts
const label = uiManager.addText("Score: 0", {
    fontSize: 32,
    color: "white",
    top: "10px",
    left: "10px",
});

// Update later
label.text = "Score: 100";
```

### Adding buttons

```ts
uiManager.addButton("startBtn", "Start Game", () => {
    console.log("Game started!");
}, {
    width: "200px",
    height: "50px",
    top: "100px",
    color: "white",
    background: "green",
});
```

### Accessing the texture

```ts
const adt = uiManager.getUI(); // AdvancedDynamicTexture | null
```

## 3D In-World UI (from JSON)

Load a GUI layout exported from the [BabylonJS GUI Editor](https://gui.babylonjs.com/) and display it on a plane mesh in 3D space.

### Loading

```ts
const texture = await uiManager.loadUI3D("inventory", "/assets/ui/inventory.json", scene, {
    position: new Vector3(0, 3, 5),
    planeWidth: 4,
    planeHeight: 2,
    resolutionWidth: 1024,
    resolutionHeight: 512,
});
```

### UI3DOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `position` | `Vector3` | `(0,0,0)` | World position of the UI plane |
| `planeWidth` | `number` | `2` | Width of the plane mesh in world units |
| `planeHeight` | `number` | `1` | Height of the plane mesh in world units |
| `resolutionWidth` | `number` | `1024` | Texture resolution width in pixels |
| `resolutionHeight` | `number` | `512` | Texture resolution height in pixels |
| `renderOnTop` | `boolean` | `false` | Render on top of all other meshes (HUD-style) |
| `billboard` | `boolean` | `false` | Always face the active camera |

### Render on top

When `renderOnTop` is `true`, the UI plane uses `renderingGroupId = 1` with depth write disabled, so it always draws over default-group meshes:

```ts
await uiManager.loadUI3D("hud3d", "/assets/ui/hud.json", scene, {
    position: new Vector3(0, 2, 3),
    renderOnTop: true,
    billboard: true, // always face the camera
});
```

### Accessing loaded UIs

```ts
const texture = uiManager.getUI3D("inventory");     // AdvancedDynamicTexture | undefined
const plane   = uiManager.getUI3DMesh("inventory"); // Mesh | undefined
```

### Disposing a single 3D UI

```ts
uiManager.disposeUI3D("inventory");
```

### Disposing everything

```ts
uiManager.dispose(); // disposes fullscreen UI + all 3D UIs
```

## Creating GUI JSON Files

1. Open the [BabylonJS GUI Editor](https://gui.babylonjs.com/).
2. Design your layout (buttons, text, images, etc.).
3. Export / save as JSON.
4. Place the file in `public/assets/ui/`.
5. Load it with `uiManager.loadUI3D()`.
