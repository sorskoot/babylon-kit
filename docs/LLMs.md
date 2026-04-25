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
    - `start()` and `dispose()`.
- `SceneManager` (`src/engine/SceneManager.ts`)
    - `addScene(key: string, scene: GameScene)` (await if scene.setup() is async)
    - `switchTo(key: string)`
    - `getActiveScene()`
- `GameScene` (`src/engine/GameScene.ts`) — extend and implement `async setup()`; use `this.scene`,
  `this.addGameObject(key, obj)`, `this.getGameObject(key)`, `initializeXR(options)`.
- `GameObject` (`src/engine/GameObject.ts`) — extend and implement `onStart()` and `onUpdate(dt: number)`. Use
  `this.node`, `this.addTag()`, `this.enabled`, `this.position`.
- `AssetManager` (`src/engine/AssetManager.ts`)
    - `loadModel(key, rootUrl, fileName, scene): Promise<AssetContainer>`
    - `instantiate(key, instanceName?, options?)` → `InstantiatedEntries` or `ThinInstanceResult`
    - `loadTexture(key, url, scene)`
    - `ThinInstanceResult` with `.addInstance()`, `.setAll()`, `.refreshBuffers()` etc.
    - Important: call `loadModel()` before `instantiate()` or an error will be thrown.
- `AnimationManager` (`src/engine/AnimationManager.ts`)
    - `registerGLBAnimations(prefix, groups)`
    - `playGLB(key, loop?, speed?, from?, to?, blendIn?)`
    - `tween(key, target, property, from, to, scene, options)`
    - `shaderTransition(...)` and `shaderMeshTransition(...)` for progress-driven GLSL effects.
- `UIManager` (`src/engine/UIManager.ts`)
    - `createFullscreenUI(name, scene)`, `addText()`, `addButton()`
    - `loadUI3D(key, url, scene, options)` and `showFloatingText(...)`.
- `ParticleManager` (`src/engine/ParticleManager.ts`)
    - `registerTemplate(key, url)`, `spawnEffect(templateKey, scene, options)`, `loadFromJSON(key, url, scene, options)`
- `XRManager` (`src/engine/XRManager.ts`)
    - `initialize(options)`, `enterXR()`, `exitXR()`, `isInXR()`, motion controller helpers.
- `InteractionManager` (`src/engine/InteractionManager.ts`)
    - `enableInteraction(gameObject)`, `enableInteractionByTag(tag)`, `pick()`

Guidance / Constraints for the LLM

- Target language: TypeScript (ES modules).
- Import engine symbols from the package entry (or relative path to `src/index.ts`), e.g.:
    - `import { Game, GameScene, GameObject } from "../src";` (adjust path in generated file to repo layout).
- Put `await` before async operations (model loads, template loads, XR initialize).
- Do not access or modify private engine internals. Use only the public methods above.
- When generating GameScene subclasses, use `this.scene` for Babylon objects and call `this.addGameObject(...)` to
  register objects.
- If the generated code needs access to other managers (e.g. `assetManager`, `animationManager`) provide them via
  constructor parameters or ask the caller to pass references from the app bootstrap; do not assume a `this.game`
  property exists on `GameScene`.

Prompt templates (copy-paste into an LLM prompt)

1) Create a new Scene + Player GameObject (two files)

Prompt:
"Generate two TypeScript files:

- `src/scenes/MainScene.ts` exporting `MainScene extends GameScene`.
- `src/objects/Player.ts` exporting `Player extends GameObject`.

Requirements for `MainScene.setup()`:

- Create an ArcRotateCamera and a HemisphericLight.
- Make a ground mesh and position the camera to frame the scene.
- Use a constructor signature
  `constructor(engine: Engine, assetManager: AssetManager, animationManager: AnimationManager)` so the scene can call
  `await assetManager.loadModel(...)` and then instantiate the model.
- Instantiate a `Player` and register it with `this.addGameObject('player', player)`.
- If the loaded model contains `animationGroups`, call
  `animationManager.registerGLBAnimations('hero', entries.animationGroups)`.

Requirements for `Player`:

- In `onStart()` create a visible mesh (fallback box) if no `this.node` is assigned.
- Add a tag `player` and implement `onUpdate(dt)` to rotate slowly.

Return both files with proper imports and types. Ensure async loads are awaited."

2) Simple app bootstrap

Prompt:
"Generate `src/index.ts` that:

- creates `const game = new Game('renderCanvas')`;
- constructs `MainScene` (passing engine and required managers), calls
  `await game.sceneManager.addScene('main', mainScene)` and `await game.sceneManager.switchTo('main')`;
- calls `game.start()`;
- handles `window.beforeunload` to call `game.dispose()`.
  Return a single file `src/index.ts`."

Concrete examples (snippets LLMs can reuse)

- Minimal Game bootstrap (index.ts)

```ts
import {Game} from "../src"; // adjust path to package

const game = new Game("renderCanvas");

// build MainScene elsewhere and add it
// await game.sceneManager.addScene("main", new MainScene(game.getEngine(), game.assetManager, game.animationManager));
// await game.sceneManager.switchTo("main");

game.start();
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

- Tween example

```ts
animationManager.tween(
    "moveCam",
    camera,
    "radius",
    10,
    5,
    this.scene,
    {duration: 800, easingFunction: new (await import('@babylonjs/core')).CubicEase()}
);
```

- Post-process shader transition (fragment string must use `uniform float progress`)

```ts
const frag = `precision highp float; varying vec2 vUV; uniform sampler2D textureSampler; uniform float progress; void main() { vec4 c = texture2D(textureSampler, vUV); gl_FragColor = mix(c, vec4(0.0), progress); }`;
animationManager.shaderTransition("fade", frag, this.scene, {duration: 600});
```

Pitfalls & common mistakes (tell the LLM to avoid)

- Don't assume `this.game` exists on `GameScene` — pass manager references explicitly.
- Always `await` async loads.
- Do not call private or internal APIs.
- When instantiating thin instances, remember to call `ThinInstanceResult.setAll()` or `addInstance()` and optionally
  `refreshBoundingInfo()` when necessary.

Acceptance criteria (for generated code)

- Compiles under TypeScript (correct imports and exports).
- Uses only public engine APIs listed above.
- Async operations are awaited.
- Scenes are registered and switched before calling `game.start()`.

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

