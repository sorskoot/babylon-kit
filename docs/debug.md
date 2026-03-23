# Debug Tools

On-screen overlay showing FPS, frame time, entity count, and frame number.

## Setup

```typescript
import { DebugOverlay } from "./src/engine";

const debug = new DebugOverlay();
debug.init(game);    // attaches to document.body
// or
debug.init(game, document.getElementById("game-container")!);
```

## Toggle

```typescript
debug.toggle();   // flip visibility
debug.enable();   // show
debug.disable();  // hide
```

## Reading Stats Programmatically

```typescript
const stats = debug.getStats();
stats.fps;          // frames per second (averaged)
stats.frameTime;    // ms per frame (averaged)
stats.entityCount;  // current entity count
stats.frame;        // frame counter
```

## Update

Call `debug.update()` once per frame to refresh the overlay:

```typescript
// In your render loop or as a System
debug.update();
```

## Cleanup

```typescript
debug.dispose();
```

## Styling

The overlay uses inline styles with a monospace font, dark semi-transparent background, and green text. Override by accessing the DOM element after init, or fork the class.
