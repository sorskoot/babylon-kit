# Systems

The `SystemBase` / `Systems` subsystem provides a lightweight way to add
per-frame logic that lives **outside any particular scene** — engine-wide
services that run every frame regardless of which scene is active.

Examples of things you might implement as a `SystemBase`:

- Score tracking / statistics accumulator
- Global event bus tick
- Network/multiplayer synchronisation
- Achievement progress checks

---

## When to Use

Use `SystemBase` when your per-frame logic is **not tied to a specific scene or
GameObject** and needs to run continuously across scene transitions.

For scene-specific per-frame logic, override `GameScene.update()` instead.
For per-object logic, override `GameObject.onUpdate()` instead.

---

## API Reference

### SystemBase

| Method | Description |
|--------|-------------|
| `register()` | Called once asynchronously when the system is registered with `Systems`. Override to run async setup. |
| `update(delta)` | Called every frame with `delta` in seconds. Override to add per-frame logic. |

### Systems (accessed via `game.systems`)

| Method | Signature | Description |
|--------|-----------|-------------|
| `register` | `(name, system) → Promise<void>` | Registers a system and calls `system.register()`. Replaces any existing system with the same name. |
| `get` | `(name) → SystemBase \| undefined` | Retrieves a registered system by name. |
| `update` | `(delta) → void` | Ticks every registered system. Called automatically by `GameScene` each frame. |

---

## Code Example

```ts
import { SystemBase, Game } from "@sorskoot/babylon-kit";

// 1. Define your system
class ScoreSystem extends SystemBase {
    private score = 0;
    private elapsed = 0;

    public override async register(): Promise<void> {
        // Async setup — load saved score, connect to leaderboard, etc.
        console.log("ScoreSystem ready");
    }

    public override update(delta: number): void {
        this.elapsed += delta;
        // Award 1 point per second of survival
        if (this.elapsed >= 1) {
            this.score++;
            this.elapsed -= 1;
        }
    }

    public getScore(): number {
        return this.score;
    }
}

// 2. Register it once (e.g. in main.ts, before the first scene)
const game = new Game("gameCanvas");
const scoreSystem = new ScoreSystem();
await game.systems.register("score", scoreSystem);

// 3. Retrieve from anywhere
const sys = game.systems.get("score") as ScoreSystem;
console.log("Current score:", sys.getScore());
```

---

## Lifecycle

1. `game.systems.register("key", system)` — registers the system and awaits
   `system.register()`.
2. Every frame, `GameScene` calls `game.systems.update(deltaTime)` **before**
   any `GameObject.onUpdate()` is invoked.
3. Systems are **not** disposed automatically. If cleanup is needed, call your
   system's own teardown method in `game.dispose()` or before switching scenes.

---

## Related Subsystems

- [Scenes](scenes.md) — `GameScene.update()` for scene-scoped per-frame logic
- [Entities](entities.md) — `GameObject.onUpdate()` for per-object logic

