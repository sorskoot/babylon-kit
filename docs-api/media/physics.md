# Physics

Wrapper for physics bodies, colliders, and raycasting. Designed to integrate with Havok when connected to a Babylon.js scene.

## Setup

```typescript
import { PhysicsService } from "./src/engine";

const physics = new PhysicsService();
physics.init({ x: 0, y: -9.81, z: 0 });
```

## Gravity

```typescript
physics.gravity;                           // { x: 0, y: -9.81, z: 0 }
physics.gravity = { x: 0, y: -20, z: 0 }; // moon gravity? nah, heavy gravity
```

## Rigid Bodies

```typescript
physics.addRigidBody(entity.id, {
    type: "dynamic",
    mass: 10,
    friction: 0.5,
    restitution: 0.3,
});

const body = physics.getRigidBody(entity.id);
physics.removeRigidBody(entity.id);
```

### Body Types

| Type | Description |
|------|-------------|
| `dynamic` | Affected by forces and gravity |
| `kinematic` | Moved programmatically, affects dynamic bodies |
| `static` | Immovable, affects dynamic bodies |

## Colliders

```typescript
physics.addCollider(entity.id, {
    type: "box",
    size: { x: 1, y: 1, z: 1 },
    isTrigger: false,
});

physics.addCollider(entity.id, {
    type: "sphere",
    radius: 0.5,
});

physics.addCollider(entity.id, {
    type: "capsule",
    radius: 0.3,
    height: 1.8,
});
```

## Raycasting

```typescript
const hit = physics.raycast(
    { x: 0, y: 5, z: 0 },    // origin
    { x: 0, y: -1, z: 0 },   // direction
    100                        // max distance
);

if (hit) {
    console.log(hit.point);     // world-space hit point
    console.log(hit.normal);    // surface normal
    console.log(hit.distance);  // distance from origin
    console.log(hit.entityId);  // entity that was hit
}
```

> Raycasting currently returns `null` — it will be wired up when Havok integration is complete.

## Cleanup

```typescript
physics.dispose();
```
