# Input

`InputManager` centralises all player input — keyboard, mouse, gamepad, and XR
motion controllers — into a uniform named-action system.  It is created
automatically by `GameScene` and is available via `this.inputManager` (or
`getInputManager()` from outside the scene).

---

## Core Concept: named actions

Instead of hard-coding raw key/button checks throughout your game, you **bind**
a human-readable action name to one or more physical inputs once, then
**query** or **listen to** that action everywhere else.

```ts
// Bind "interact" to F, Enter, gamepad A, and XR trigger — all at once
this.inputManager.bindAction("interact", {
    keys: [Key.F, Key.Enter],
    gamepadButtons: [GamepadButton.A],
    xrTrigger: true,
});

// Bind "sprint" to either Shift key
this.inputManager.bindAction("sprint", {
    keys: [Key.ShiftLeft, Key.ShiftRight],
    gamepadButtons: [GamepadButton.LeftBumper],
});
```

Rebinding later is just another `bindAction` call with the same name.

---

## Imports

```ts
import {
    InputManager,
    InputSource,
    ActionBinding,
    Key,
    GamepadButton,
    MouseButton,
} from "@sorskoot/babylon-kit";
```

---

## Binding actions

### `bindAction(name, binding)`

Declares (or replaces) a named action with its physical input bindings.
Returns `this` for chaining.

```ts
this.inputManager
    .bindAction("jump", { keys: [Key.Space], gamepadButtons: [GamepadButton.A] })
    .bindAction("fire", { mouseButtons: [MouseButton.Left], xrTrigger: true })
    .bindAction("grab", { xrSqueeze: true });
```

### ActionBinding options

| Field | Type | Description |
|-------|------|-------------|
| `keys` | `string[]` | Keyboard key codes — use `Key.*` constants or any [`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code) value |
| `mouseButtons` | `MouseButton[]` | Mouse buttons (`MouseButton.Left`, `Middle`, `Right`) |
| `gamepadButtons` | `GamepadButton[]` | Gamepad button indices (`GamepadButton.A`, `B`, `X`, `Y`, …) |
| `xrTrigger` | `boolean` | XR controller trigger press |
| `xrSqueeze` | `boolean` | XR controller squeeze press |

---

## Listening to actions (event-based)

Register a callback that fires every time the action is triggered, regardless
of which bound input caused it. The `source` parameter tells you which device
fired it.

```ts
this.inputManager.onAction("interact", (source: InputSource) => {
    console.log("Interact triggered by:", source);
    // source is "keyboard", "mouse", "gamepad", or "xr"
});
```

Remove a callback with `offAction`:

```ts
const handler = (source: InputSource) => { … };
this.inputManager.onAction("interact", handler);
// …later…
this.inputManager.offAction("interact", handler);
```

### `onActionFired` Observable

For advanced use you can subscribe to the global observable that fires for
every action:

```ts
this.inputManager.onActionFired.add(({ action, source }) => {
    console.log(`${action} fired by ${source}`);
});
```

---

## Polling actions per-frame

Polling is the easiest approach inside `onUpdate`. Each method reflects the
**current frame's** state for the named action across all its bindings.

```ts
public onUpdate(deltaTime: number): void {
    if (this.inputManager.isActionPressed("jump")) {
        // First frame the jump binding was activated
        this.velocity.y = 5;
    }

    if (this.inputManager.isActionHeld("sprint")) {
        // True every frame while any sprint binding is held
        this.speed = 10;
    } else {
        this.speed = 5;
    }

    if (this.inputManager.isActionReleased("fire")) {
        // First frame the fire binding was released
        this.stopFiring();
    }
}
```

| Method | Returns `true` when… |
|--------|----------------------|
| `isActionPressed(name)` | The first frame any bound input was activated |
| `isActionHeld(name)` | Any bound input is currently held down |
| `isActionReleased(name)` | The first frame any bound input was released |

---

## Raw input queries

When you need low-level access without named actions:

```ts
// Keyboard
this.inputManager.isKeyHeld("KeyW");
this.inputManager.isKeyPressed(Key.Space);
this.inputManager.isKeyReleased(Key.Escape);

// Mouse
this.inputManager.isMouseButtonHeld(MouseButton.Right);
this.inputManager.isMouseButtonPressed(MouseButton.Left);

// Gamepad
this.inputManager.isGamepadButtonHeld(GamepadButton.RightTrigger);
this.inputManager.isGamepadButtonPressed(GamepadButton.Start);

// Check if any controller is connected
if (this.inputManager.hasGamepad()) { … }
```

---

## Key reference

```ts
enum Key {
    Space, Enter, Escape, Tab, Backspace,
    ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
    W, A, S, D, Q, E, R, F, G, H,
    ShiftLeft, ShiftRight,
    ControlLeft, ControlRight,
    AltLeft, AltRight,
}
```

For any key not listed, pass the raw `KeyboardEvent.code` string directly:

```ts
this.inputManager.bindAction("reload", { keys: ["KeyR"] });
this.inputManager.isKeyPressed("Digit1");
```

---

## Gamepad button reference

Button indices follow the [standard Gamepad API mapping](https://w3c.github.io/gamepad/#remapping) (Xbox layout):

| Constant | Index | Xbox | DualShock |
|----------|-------|------|-----------|
| `GamepadButton.A` | 0 | A | Cross |
| `GamepadButton.B` | 1 | B | Circle |
| `GamepadButton.X` | 2 | X | Square |
| `GamepadButton.Y` | 3 | Y | Triangle |
| `GamepadButton.LeftBumper` | 4 | LB | L1 |
| `GamepadButton.RightBumper` | 5 | RB | R1 |
| `GamepadButton.LeftTrigger` | 6 | LT | L2 |
| `GamepadButton.RightTrigger` | 7 | RT | R2 |
| `GamepadButton.Select` | 8 | View | Share |
| `GamepadButton.Start` | 9 | Menu | Options |
| `GamepadButton.LeftStick` | 10 | LS | L3 |
| `GamepadButton.RightStick` | 11 | RS | R3 |
| `GamepadButton.DPadUp` | 12 | D-Up | D-Up |
| `GamepadButton.DPadDown` | 13 | D-Down | D-Down |
| `GamepadButton.DPadLeft` | 14 | D-Left | D-Left |
| `GamepadButton.DPadRight` | 15 | D-Right | D-Right |

---

## XR controller input

### Connecting XR to InputManager

After calling `initializeXR()`, pass the returned experience to `connectXR()`
so trigger and squeeze presses flow through the action system:

```ts
async setup(): Promise<void> {
    // … camera, lights, meshes …

    const xr = await this.initializeXR({
        movement: { mode: "locomotion", movementSpeed: 0.1 },
    });

    this.inputManager
        .bindAction("interact", { xrTrigger: true, keys: [Key.F] })
        .connectXR(xr);
}
```

XR presses now call any `onAction("interact", …)` listeners and are picked up
by `isActionPressed("interact")` — the same as keyboard or gamepad.

### Routing XR picks through InteractionManager

Use `bindPickAction` to wire an action so that its XR trigger press (or any
source) performs a raycast and calls `onInteract(source)` on the hit object:

```ts
this.inputManager.bindAction("interact", {
    keys: [Key.F],
    gamepadButtons: [GamepadButton.A],
    xrTrigger: true,
});

this.interactionManager.bindPickAction(this.inputManager, "interact");
```

Now clicking a mesh, pressing F, pressing A on a gamepad, or pulling a VR
trigger all call the same `onInteract` handler on the targeted `GameObject`.

---

## Wiring interaction end-to-end

A complete pattern combining InputManager, InteractionManager, and GameObject:

```ts
// 1. GameScene.setup() — declare bindings and connect everything
async setup(): Promise<void> {
    // Build scene …
    const crateObj = new Crate("crate", this.scene);
    crateObj.node = mesh;
    this.addGameObject("crate", crateObj);

    // Declare "interact" action (keyboard + gamepad + XR)
    this.inputManager.bindAction("interact", {
        keys: [Key.F],
        gamepadButtons: [GamepadButton.A],
        xrTrigger: true,
    });

    // Mouse click still works independently via ActionManager
    this.interactionManager.enableInteraction(crateObj);

    // Keyboard / gamepad / XR trigger → pick + onInteract
    this.interactionManager.bindPickAction(this.inputManager, "interact");

    // XR
    const xr = await this.initializeXR();
    this.inputManager.connectXR(xr);
}
```

```ts
// 2. Crate.ts — react to any input source
export class Crate extends GameObject {
    public onStart(): void { this.addTag("prop"); }
    public onUpdate(dt: number): void { /* … */ }

    public onInteract(source?: InputSource): void {
        console.log(`Crate opened via ${source ?? "unknown"}`);
    }
}
```

---

## Frame lifecycle

`InputManager.update()` is called automatically by `GameScene` at the start of
every frame to flush the one-frame `pressed` and `released` buffers.  You
never need to call it yourself unless you are managing the game loop manually.

---

## Disposal

`InputManager` is disposed automatically when the `GameScene` is disposed.
Manual disposal:

```ts
this.inputManager.dispose();
```

This detaches all observers, clears all action bindings and callbacks, and
disposes the internal `GamepadManager`.

---

## See also

- [Entities & Interaction](./entities.md) — `GameObject`, click interaction, `InteractionManager`
- [WebXR](./webxr.md) — VR session setup, locomotion, `XRManager`
- [Getting Started](./getting-started.md) — project setup and first scene

