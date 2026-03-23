# Input System

Unified input handling for keyboard, mouse, and gamepad with an action mapping layer.

## Setup

```typescript
import { InputSystem } from "./src/engine";

const input = new InputSystem();
input.attach(canvas);  // or attach(window)

// In your game loop:
input.update();  // call once per frame to flush events
```

## Raw Input

```typescript
// Keyboard
input.isKeyDown("KeyW");      // held this frame
input.isKeyJustDown("Space");  // pressed this frame
input.isKeyJustUp("Space");    // released this frame

// Mouse
input.isMouseButtonDown(0);    // left button
input.mouseX;                  // screen position
input.mouseY;
input.mouseDeltaX;             // movement since last frame
input.mouseDeltaY;

// Gamepad
input.getGamepadAxis(0, 0);          // left stick X
input.isGamepadButtonDown(0, 0);     // A button
```

## Action Mapping

Define input actions with one or more bindings:

```typescript
input.registerAction({
    name: "moveForward",
    bindings: [
        { type: "keyboard", code: "KeyW", scale: 1 },
        { type: "gamepad", code: "0:axis1", scale: -1 },
    ],
});

input.registerAction({
    name: "jump",
    bindings: [
        { type: "keyboard", code: "Space" },
        { type: "gamepad", code: "0:0" },  // A button
    ],
});
```

### Querying Actions

```typescript
input.isActionPressed("jump");    // just pressed this frame
input.isActionHeld("jump");       // held down
input.isActionReleased("jump");   // just released
input.getActionValue("moveForward");  // -1 to 1 analog value
```

### Binding Format

| Type | Code Format | Examples |
|------|-------------|---------|
| `keyboard` | [KeyboardEvent.code](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code) | `"KeyW"`, `"Space"`, `"ArrowUp"` |
| `mouse` | Button number or `"MouseMove"` | `"0"` (left), `"2"` (right) |
| `gamepad` | `"gpIndex:buttonOrAxis"` | `"0:0"` (A), `"0:axis0"` (left stick X) |

### Scale

Use `scale` to invert or weight bindings:

```typescript
{ type: "keyboard", code: "KeyS", scale: -1 }  // negative direction
```

## Cleanup

```typescript
input.unregisterAction("jump");
input.detach();  // removes all event listeners
```
