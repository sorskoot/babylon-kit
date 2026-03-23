# Engine Core

## GameEngine

The central orchestrator. Sets up Babylon.js, creates entities, manages systems
and services, and drives the game loop — all in a few lines of code.

```typescript
import { GameEngine } from "./src/engine";

const game = new GameEngine({ debug: true });
await game.initialize();   // canvas, Babylon engine, scene, camera, light, WebXR
game.start();               // render loop starts automatically
```

### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `canvasId` | `string` | `"renderCanvas"` | ID of the canvas element. If no element is found, a full-viewport canvas is created automatically. |
| `canvas` | `HTMLCanvasElement` | — | Direct canvas reference (takes precedence over `canvasId`). |
| `antialias` | `boolean` | `true` | Enable antialiasing |
| `adaptToDeviceRatio` | `boolean` | `true` | Adapt to device pixel ratio |
| `targetFps` | `number` | `60` | Target frames per second |
| `fixedTimeStep` | `number` | `1/60` | Fixed physics step interval |
| `debug` | `boolean` | `false` | Enable debug mode |
| `webXR` | `boolean` | `true` | Automatically create a WebXR experience |
| `createDefaultCamera` | `boolean` | `true` | Create a default FreeCamera at `(0, 1.6, -3)` |
| `createDefaultLight` | `boolean` | `true` | Create a default hemispheric light |

### Initialization

Call `initialize()` once before `start()`. It handles all the Babylon.js
boilerplate:

1. Resolves or creates a `<canvas>` element
2. Creates the Babylon.js `Engine` and `Scene`
3. Adds a default camera and light (configurable)
4. Sets up a WebXR experience (configurable, gracefully degrades)
5. Registers a window resize handler

```typescript
const game = new GameEngine({ canvasId: "myCanvas", webXR: false });
await game.initialize();

// Access the managed Babylon.js objects:
game.canvas;          // HTMLCanvasElement
game.babylonEngine;   // Babylon Engine instance
game.scene;           // Babylon Scene instance
game.xr;              // WebXRDefaultExperience (if enabled)
game.initialized;     // true
```

### Lifecycle

After initialization, `start()` begins the Babylon.js render loop
automatically. There is no need to call `runRenderLoop()` or `tick()` yourself.

```typescript
game.start();    // Start the game loop and Babylon.js render loop
game.pause();    // Pause (systems stop, rendering continues)
game.resume();   // Resume from pause
game.stop();     // Stop the game loop and render loop
game.dispose();  // Dispose of all Babylon.js resources
```

### ECS-only Mode (Tests)

You can use the engine without calling `initialize()` — ECS, systems, and
services work without Babylon.js. This is useful for unit tests in Node.js.

```typescript
const game = new GameEngine();
game.registerSystem(new MySystem());
game.start();
game.tick(0);
game.tick(16.67);
game.stop();
```

## Game Loop

Each frame runs three phases:

1. **Fixed Update** — Called at a fixed interval for deterministic physics/gameplay
2. **Update** — Called once per frame with variable delta
3. **Render** — Calls `scene.render()` automatically (even while paused)

Delta time is capped at 0.25s to prevent spiral-of-death when the tab loses focus.

### Time State

```typescript
game.time.delta        // seconds since last frame (scaled)
game.time.elapsed      // total elapsed time (scaled)
game.time.fixedDelta   // fixed timestep interval
game.time.timeScale    // slow motion: 0.5, fast forward: 2.0
game.time.frame        // frame counter
game.time.paused       // whether the loop is paused
```

### Slow Motion

```typescript
game.time.timeScale = 0.5;  // half speed
game.time.timeScale = 2.0;  // double speed
game.time.timeScale = 1.0;  // normal
```

## Services

Register any object as a service for dependency injection:

```typescript
game.registerService("input", inputSystem);
game.registerService("audio", audioManager);

const input = game.getService<InputSystem>("input");
```
