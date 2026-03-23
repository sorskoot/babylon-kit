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

```typescript
import { System } from "./src/engine";

class MovementSystem extends System {
    readonly name = "movement";

    constructor() {
        super(10); // priority
    }

    update(delta: number): void {
        for (const entity of this.engine.entities) {
            const vel = entity.getComponent(Velocity);
            const transform = entity.getComponent(TransformLink);
            if (vel && transform) {
                transform.mesh.position.x += vel.x * delta;
                transform.mesh.position.y += vel.y * delta;
                transform.mesh.position.z += vel.z * delta;
            }
        }
    }
}
```

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
