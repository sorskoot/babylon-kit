# Using LLMs to generate code with this engine

Purpose
-------
This file contains a compact, LLM-friendly reference and ready-to-paste prompt templates for generating TypeScript code
that uses the engine in `src/`. Use these guidelines when asking an LLM to produce scenes, game objects, UI, assets,
animations, particles or XR code so the output is correct, idiomatic and compiles against the public API.

Checklist (what to include in every generated response)

- A short description of the generated files and where to place them (paths relative to the repo root).
- All required imports (engine exports from `src/index.ts` and Babylon packages).
- Async `await` around asset loads (`AssetManager.loadModel`, `ParticleManager.registerTemplate`, etc.).
- Use only the public API described below (don't modify engine internals).
- Register scenes with `SceneManager.addScene()` and call `SceneManager.switchTo()` before `Game.start()`.
- Dispose resources or note where to dispose.

Public API summary (what the LLM should use)

- `Game` (`src/engine/Game.ts`) — top-level entry. Construct with a canvas id: `new Game("renderCanvas")`. Exposes:
    - `.sceneManager` (SceneManager)
    - `.assetManager` (AssetManager)
    - `.uiManager` (UIManager)
    - `.particleManager` (ParticleManager)
    - `.animationManager` (AnimationManager)
    - `getEngine()` — returns the underlying BabylonJS `Engine`.
    - `getCanvas()` — returns the `HTMLCanvasElement`.
    - `start()` and `dispose()`.
- `SceneManager` (`src/engine/SceneManager.ts`)
    - `addScene(key: string, scene: GameScene): Promise<void>` — registers and calls `scene.setup()`.
    - `switchTo(key: string): Promise<void>` — makes the scene active.
    - `getActiveScene(): Scene | null` — returns the BabylonJS `Scene` of the active `GameScene`.
    - `getActiveGameScene(): GameScene | null` — returns the active `GameScene` instance.
    - `removeScene(key: string): void` — disposes and unregisters a scene.
    - `getEngine(): Engine` — returns the shared BabylonJS engine.
- `GameScene` (`src/engine/GameScene.ts`) — extend and implement `async setup(): Promise<void>`.
    - **Base constructor**: `constructor(engine: Engine)`. Additional manager references (e.g. `assetManager`) must be
      passed via the *subclass* constructor.
    - `this.scene` — the BabylonJS `Scene`.
    - `getScene(): Scene`
    - `addGameObject(key: string, obj: GameObject): void` — registers and calls `obj.onStart()`.
    - `getGameObject(key: string): GameObject | undefined`
    - `getGameObjectsByTag(tag: string): GameObject[]`
    - `removeGameObject(key: string): void` — disposes and unregisters the object.
    - `initializeXR(options?: XRManagerOptions): Promise<WebXRDefaultExperience>`
    - `getInteractionManager(): InteractionManager`
    - `getInputManager(): InputManager`
    - `getXRManager(): XRManager`
    - `update(deltaTime: number): void` (override for scene-level per-frame logic).
    - `dispose(): void`
- `GameObject` (`src/engine/GameObject.ts`) — extend and implement `onStart()` and `onUpdate(dt: number)`.
    - **Constructor**: `constructor(name: string, scene: Scene)`.
    - `this.node: TransformNode | null` — the BabylonJS scene node.
    - `this.enabled: boolean` — enables/disables updates and the node.
    - `this.position: Vector3` — world-space position shortcut.
    - `this.tags: Set<string>`
    - `addTag(tag: string): void`
    - `hasTag(tag: string): boolean`
    - `onInteract(source?: InputSource): void` — override to handle interactions.
    - `dispose(): void`
- `AssetManager` (`src/engine/AssetManager.ts`)
    - `loadModel(key, rootUrl, fileName, scene): Promise<AssetContainer>`
    - `instantiate(key, instanceName?, options?)` → `InstantiatedEntries` or `ThinInstanceResult`
    - `loadTexture(key, url, scene): Texture`
    - `getTexture(key): Texture | undefined`
    - `getModel(key): AssetContainer | undefined`
    - `static findByMetadataId(entries: InstantiatedEntries, metadataId: string): TransformNode | null`
    - `ThinInstanceResult` with `.addInstance()`, `.setAll()`, `.setInstanceMatrix()`, `.refreshBuffers()`,
      `.refreshBoundingInfo()`, `.count`, `.meshes`, `.dispose()`.
    - Important: call `loadModel()` before `instantiate()` or an error will be thrown.
- `AnimationManager` (`src/engine/AnimationManager.ts`)
    - `registerGLBAnimations(prefix, groups): void`
    - `playGLB(key, loop?, speed?, from?, to?, blendIn?): AnimationGroup | undefined`
    - `stopGLB(key): void`
    - `crossFadeGLB(fromKey, toKey, duration): void`
    - `tween(key, target, property, from, to, scene, options): void`
    - `stopTween(key): void`
    - `shaderTransition(key, fragmentSource, scene, options): void`
    - `shaderMeshTransition(key, mesh, vertexSource, fragmentSource, scene, options, uniforms?): ShaderMaterial`
    - `get(key): ManagedAnimation | undefined`
    - `has(key): boolean`
    - `stop(key): void` — stops and disposes a single managed animation.
    - `dispose(): void`
- `UIManager` (`src/engine/UIManager.ts`)
    - `createFullscreenUI(name, scene): AdvancedDynamicTexture`
    - `getUI(): AdvancedDynamicTexture | null`
    - `addText(text, options?): TextBlock`
    - `addButton(name, label, onClick, options?): Button`
    - `loadUI3D(key, url, scene, options?): Promise<AdvancedDynamicTexture>`
    - `getUI3D(key): AdvancedDynamicTexture | undefined`
    - `getUI3DMesh(key): Mesh | undefined`
    - `disposeUI3D(key): void`
    - `showFloatingText(text, scene, durationMs?, options?): Promise<void>`
- `ParticleManager` (`src/engine/ParticleManager.ts`)
    - `registerTemplate(key, url): Promise<void>` — pre-fetches a JSON template (no `scene` param).
    - `hasTemplate(key): boolean`
    - `spawnEffect(templateKey, scene, options): ParticleSystem` — one-shot effect; auto-disposes.
    - `loadFromJSON(key, url, scene, options?): Promise<ParticleSystem>` — persistent looping system.
    - `getSystem(key): ParticleSystem | undefined`
    - `setEmitterPosition(key, position): void`
    - `setEmitterMesh(key, mesh): void`
    - `disposeSystem(key): void`
- `XRManager` (`src/engine/XRManager.ts`)
    - `static isSupported(): Promise<boolean>`
    - `initialize(options?: XRManagerOptions): Promise<WebXRDefaultExperience>`
    - `enterXR(): Promise<void>`
    - `exitXR(): Promise<void>`
    - `isInXR(): boolean`
    - `getExperience(): WebXRDefaultExperience | null`
    - `getControllers(): WebXRInputSource[]`
    - `onMotionControllerReady(callback): void`
    - Observables: `onStateChanged`, `onControllerAdded`, `onControllerRemoved`
- `InputManager` (`src/engine/InputManager.ts`) — centralises keyboard, mouse, gamepad, and XR input into named
  actions. Accessible via `gameScene.getInputManager()`.
    - `bindAction(name, binding: ActionBinding): this` — declares a named action and its input bindings.
    - `onAction(name, callback): this` — subscribe to an action being fired.
    - `offAction(name, callback): void`
    - `isActionPressed(name): boolean` — true on the first frame the action was activated.
    - `isActionHeld(name): boolean` — true while any binding is held down.
    - `isActionReleased(name): boolean` — true on the first frame the action was released.
    - `isKeyHeld(key)`, `isKeyPressed(key)`, `isKeyReleased(key)` — raw keyboard queries (use `Key` enum or
      `KeyboardEvent.code` strings).
    - `isMouseButtonHeld(btn)`, `isMouseButtonPressed(btn)`, `isMouseButtonReleased(btn)` — raw mouse queries (use
      `MouseButton` enum).
    - `isGamepadButtonHeld(btn)`, `isGamepadButtonPressed(btn)`, `isGamepadButtonReleased(btn)` — raw gamepad queries
      (use `GamepadButton` enum).
    - `hasGamepad(): boolean`
    - `connectXR(xr: WebXRDefaultExperience): this` — wires XR controller trigger/squeeze to actions.
    - `onActionFired: Observable<ActionEvent>`
    - Enums exported: `Key`, `GamepadButton`, `MouseButton`.
- `InteractionManager` (`src/engine/InteractionManager.ts`) — accessible via `gameScene.getInteractionManager()`.
    - `enableInteraction(gameObject): void` — makes a `GameObject` clickable; calls `onInteract("mouse")`.
    - `enableInteractionByTag(tag): void`
    - `pick(): GameObject | null` — raycast at current pointer position.
    - `bindPickAction(inputManager, actionName?): this` — connects a named input action to pick-and-interact.
- `SceneFileLoader` (`src/engine/SceneLoader.ts`) — loads an entire Blender-exported scene and optionally maps meshes
  to GameObjects.
    - `static load(rootUrl, fileName, scene): Promise<SceneLoadResult>`
    - `static loadWithFactory(rootUrl, fileName, scene, factory): Promise<{ meshes, gameObjects }>`
    - `GameObjectFactory` type: `(name, mesh, scene) => GameObject | null`

---

Guidance / Constraints for the LLM

- Target language: TypeScript (ES modules).
- Import engine symbols from the package entry (or relative path to `src/index.ts`), e.g.:
    - `import { Game, GameScene, GameObject } from "../src";` (adjust path in generated file to repo layout).
- Put `await` before async operations (model loads, template loads, XR initialize).
- Do not access or modify private engine internals. Use only the public methods above.
- When generating GameScene subclasses, use `this.scene` for Babylon objects and call `this.addGameObject(...)` to
  register objects.
- The base `GameScene` constructor only accepts `engine: Engine`. If your scene needs other managers (e.g.
  `assetManager`, `animationManager`), add them as extra parameters in your *subclass* constructor and pass the engine
  to `super(engine)`.
- If the generated code needs access to other managers (e.g. `assetManager`, `animationManager`) provide them via
  constructor parameters or ask the caller to pass references from the app bootstrap; do not assume a `this.game`
  property exists on `GameScene`.

---

Prompt templates (copy-paste into an LLM prompt)

1) Create a new Scene + Player GameObject (two files)

Prompt:
"Generate two TypeScript files:

- `src/scenes/MainScene.ts` exporting `MainScene extends GameScene`.
- `src/objects/Player.ts` exporting `Player extends GameObject`.

Requirements for `MainScene`:

- Constructor signature:
  `constructor(engine: Engine, assetManager: AssetManager, animationManager: AnimationManager)`.
  Call `super(engine)` inside.
- In `setup()`:
    - Create an ArcRotateCamera and a HemisphericLight.
    - Make a ground mesh and position the camera to frame the scene.
    - `await assetManager.loadModel(...)` then call `assetManager.instantiate(...)`.
    - Instantiate a `Player` and register it with `this.addGameObject('player', player)`.
    - If the loaded model contains `animationGroups`, call
      `animationManager.registerGLBAnimations('hero', entries.animationGroups)`.

Requirements for `Player`:

- Constructor: `constructor(name: string, scene: Scene)`.
- In `onStart()` create a visible mesh (fallback box) if no `this.node` is assigned.
- Add a tag `player` and implement `onUpdate(dt)` to rotate slowly.

Return both files with proper imports and types. Ensure async loads are awaited."

2) Simple app bootstrap

Prompt:
"Generate `src/index.ts` that:

- creates `const game = new Game('renderCanvas')`;
- constructs `MainScene` passing `game.getEngine()`, `game.assetManager`, and `game.animationManager`; calls
  `await game.sceneManager.addScene('main', mainScene)` and `await game.sceneManager.switchTo('main')`;
- calls `game.start()`;
- handles `window.beforeunload` to call `game.dispose()`.
  Return a single file `src/index.ts`."

---

Concrete examples (snippets LLMs can reuse)

- Minimal Game bootstrap (index.ts)

```ts
import { Game } from "../src"; // adjust path to package

const game = new Game("renderCanvas");

// Construct MainScene elsewhere and add it:
// const mainScene = new MainScene(game.getEngine(), game.assetManager, game.animationManager);
// await game.sceneManager.addScene("main", mainScene);
// await game.sceneManager.switchTo("main");

game.start();

window.addEventListener("beforeunload", () => game.dispose());
```

- Loading a GLB and registering animations (in a Scene.setup())

```ts
const container = await assetManager.loadModel("hero", "/assets/models", "hero.glb", this.scene);
const entries = assetManager.instantiate("hero", "heroInst");
if (entries.animationGroups && entries.animationGroups.length > 0) {
    animationManager.registerGLBAnimations("hero", entries.animationGroups);
    animationManager.playGLB("hero_Idle");
}
```

- Input binding (in a GameScene subclass)

```ts
const input = this.getInputManager();
input
    .bindAction("interact", {
        keys: [Key.F, Key.Enter],
        gamepadButtons: [GamepadButton.A],
        xrTrigger: true,
    })
    .onAction("interact", (source) => {
        console.log("Interact triggered by", source);
    });
```

- Tween example

```ts
animationManager.tween(
    "moveCam",
    camera,
    "radius",
    10,
    5,
    this.scene,
    { duration: 800, easingFunction: new CubicEase() }
);
```

- Cross-fade between GLB animations

```ts
animationManager.crossFadeGLB("hero_Idle", "hero_Run", 0.3);
```

- Post-process shader transition (fragment string must use `uniform float progress`)

```ts
const frag = `precision highp float; varying vec2 vUV; uniform sampler2D textureSampler; uniform float progress; void main() { vec4 c = texture2D(textureSampler, vUV); gl_FragColor = mix(c, vec4(0.0), progress); }`;
animationManager.shaderTransition("fade", frag, this.scene, { duration: 600 });
```

- Thin instances (many identical objects)

```ts
await assetManager.loadModel("tree", "/assets/models", "tree.glb", this.scene);
const trees = assetManager.instantiate("tree", undefined, { thinInstance: true });
trees.setAll([
    Matrix.Translation(0, 0, 5),
    Matrix.Translation(3, 0, 8),
    Matrix.Translation(-2, 0, 12),
]);
trees.refreshBoundingInfo();
```

- Finding a node by Sorskoot metadata id

```ts
const entries = assetManager.instantiate("level");
const door = AssetManager.findByMetadataId(entries, "door_01");
if (door) door.position.y += 2; // open the door
```

- Loading an entire Blender scene with a factory

```ts
const { gameObjects } = await SceneFileLoader.loadWithFactory(
    "/assets/models", "level.glb", this.scene,
    (name, mesh, scene) => {
        if (name.startsWith("enemy_")) return new Enemy(name, scene);
        if (name.startsWith("pickup_")) return new Pickup(name, scene);
        return null;
    }
);
for (const [key, obj] of gameObjects) {
    this.addGameObject(key, obj);
}
```

---

Pitfalls & common mistakes (tell the LLM to avoid)

- Don't assume `this.game` exists on `GameScene` — pass manager references explicitly via the subclass constructor.
- The base `GameScene` constructor only accepts `engine: Engine`; always call `super(engine)` in subclasses.
- `registerTemplate(key, url)` does **not** take a `scene` parameter.
- Always `await` async loads (`loadModel`, `registerTemplate`, `loadFromJSON`, `loadUI3D`, `initializeXR`).
- Do not call private or internal APIs.
- When instantiating thin instances, call `ThinInstanceResult.setAll()` or `addInstance()` before rendering.
  Call `refreshBoundingInfo()` when needed for frustum culling or picking.
- `SceneManager.getActiveScene()` returns the BabylonJS `Scene`. Use `getActiveGameScene()` to get the `GameScene`.

---

Acceptance criteria (for generated code)

- Compiles under TypeScript (correct imports and exports).
- Uses only public engine APIs listed above.
- Async operations are awaited.
- Scenes are registered and switched before calling `game.start()`.

---

Quick local test (PowerShell)

```powershell
npm install
# serve or dev commands depend on your project setup; common options:
npm run dev
# or
npm run start
```

If you want, I can now generate example files (`MainScene.ts`, `Player.ts`, `src/index.ts`) and a short README showing
how to wire them into the existing project. Reply with which files you'd like me to create.
