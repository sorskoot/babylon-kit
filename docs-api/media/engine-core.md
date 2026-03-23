# Engine Core

## GameEngine

The central orchestrator. Creates entities, manages systems and services, and drives the game loop.

```typescript
import { GameEngine } from "./src/engine";

const game = new GameEngine({
    debug: true,
    targetFps: 60,
    fixedTimeStep: 1 / 60,
});
```

### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `canvasId` | `string` | — | ID of the canvas element |
| `canvas` | `HTMLCanvasElement` | — | Direct canvas reference |
| `antialias` | `boolean` | `true` | Enable antialiasing |
| `adaptToDeviceRatio` | `boolean` | `true` | Adapt to device pixel ratio |
| `targetFps` | `number` | `60` | Target frames per second |
| `fixedTimeStep` | `number` | `1/60` | Fixed physics step interval |
| `debug` | `boolean` | `false` | Enable debug mode |

### Lifecycle

```typescript
game.start();   // Begin the game loop
game.pause();   // Pause (systems stop updating, render continues)
game.resume();  // Resume from pause
game.stop();    // Stop the game loop entirely
```

## Game Loop

The loop runs three phases each frame:

1. **Fixed Update** — Called at a fixed interval for deterministic physics/gameplay
2. **Update** — Called once per frame with variable delta
3. **Render** — Called once per frame for Babylon.js rendering

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
