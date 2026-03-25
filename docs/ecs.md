# Entity Component System (ECS)

A simplified component model where **entities** are containers, **components** hold data, and **systems** contain logic.

## Entities

```typescript
const player = game.createEntity("Player");
player.enabled = false;  // skip updates
game.destroyEntity(player);  // removes and cleans up
```

Entities have auto-incrementing IDs and a name. Destroying an entity calls `onRemove` on all attached components.

## Components

Extend the `Component` base class. Keep them as data holders.

```typescript
import { Component } from "./src/engine";

class Health extends Component {
    current = 100;
    max = 100;
}

class Velocity extends Component {
    x = 0;
    y = 0;
    z = 0;
}
```

### Lifecycle Hooks

| Hook | When |
|------|------|
| `onAdd()` | After component is attached to an entity |
| `onRemove()` | Before component is detached |
| `onUpdate(delta)` | Every frame (called by engine) |
| `onEnable()` | When component is enabled |
| `onDisable()` | When component is disabled |

### Usage

```typescript
const entity = game.createEntity("Enemy");
const hp = entity.addComponent(new Health());
hp.current = 50;

entity.hasComponent(Health);       // true
entity.getComponent(Health);       // Health instance
entity.removeComponent(Health);    // calls onRemove
```

## Systems

Extend `System` and implement `update()`. Systems run in priority order (lower = earlier).

### Querying entities — use the component index

Instead of iterating over **all** entities each frame, use
`engine.getEntitiesWithComponent()`. The engine maintains an internal
[`ComponentIndex`](../src/engine/core/componentIndex.ts) that is updated in
**O(1)** whenever a component is added or removed, so every query is a single
`Map.get` returning a live `Set` of only the matching entities.

```typescript
import { System, IGameEngine } from "./src/engine";

class MovementSystem extends System {
    readonly name = "movement";
    private _engine!: IGameEngine;

    constructor() {
        super(10); // priority
    }

    override onRegister(engine: IGameEngine): void {
        this._engine = engine;
    }

    update(delta: number): void {
        // O(k) — only iterates entities that actually have Velocity
        for (const entity of this._engine.getEntitiesWithComponent(Velocity)) {
            const vel = entity.getComponent(Velocity)!;
            const transform = entity.getComponent(TransformLink);
            if (!transform) continue;
            transform.mesh.position.x += vel.x * delta;
            transform.mesh.position.y += vel.y * delta;
            transform.mesh.position.z += vel.z * delta;
        }
    }
}
```

> **Do not** iterate `engine.entities` in systems — that is an O(n) scan over
> every entity regardless of which components it has. Always prefer
> `getEntitiesWithComponent()`.

### Fixed Update

Override `fixedUpdate` for deterministic physics-rate logic:

```typescript
class PhysicsSystem extends System {
    readonly name = "physics";

    update(delta: number): void { /* variable rate */ }

    fixedUpdate(delta: number): void {
        // called at fixed intervals (default 1/60s)
    }
}
```

### Registration

```typescript
game.registerSystem(new MovementSystem());
game.registerSystem(new PhysicsSystem());

const movement = game.getSystem<MovementSystem>("movement");
movement.enabled = false;  // disable temporarily

game.unregisterSystem(movement);
```

## ComponentIndex

The engine's internal `ComponentIndex` is what powers `getEntitiesWithComponent`.
It is wired up automatically — you never need to interact with it directly.

For advanced use cases (e.g. custom test harnesses) you can import and
instantiate it standalone:

```typescript
import { ComponentIndex } from "@sorskoot/babylon-kit";

const index = new ComponentIndex();
index.onComponentAdded(entity, "Health");
const entities = index.getEntities(Health); // ReadonlySet<IEntity>
index.clear(); // reset between tests
```

