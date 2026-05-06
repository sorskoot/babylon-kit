# Particles

`ParticleManager` handles two kinds of particle systems:

- **Persistent systems** — looping effects (fire, smoke, ambient dust) that stay alive until you dispose them.
- **One-shot effects** — short-lived bursts (explosions, impacts) that auto-dispose after playing.

## Persistent Systems

### Loading from JSON

```ts
const system = await particleManager.loadFromJSON(
    "campfire",                          // cache key
    "/assets/particles/fire.json",       // JSON URL
    scene,
    { position: new Vector3(0, 0, 3) },  // options
);
```

The system starts automatically. To delay, pass `autoStart: false`:

```ts
const system = await particleManager.loadFromJSON("campfire", url, scene, {
    position: new Vector3(0, 0, 3),
    autoStart: false,
});
system.start(); // start manually later
```

### ParticleSystemOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `position` | `Vector3` | — | World position for the emitter |
| `emitter` | `AbstractMesh \| Vector3` | — | Override emitter (takes precedence over `position`) |
| `textureUrl` | `string` | — | Override the particle texture URL |
| `capacity` | `number` | `1000` | Max particle count |
| `autoStart` | `boolean` | `true` | Start emitting immediately |

### Moving a persistent system

```ts
particleManager.setEmitterPosition("campfire", new Vector3(5, 0, 3));
```

### Attaching to a mesh

```ts
particleManager.setEmitterMesh("campfire", torchMesh);
```

The particles will follow the mesh as it moves.

### Retrieving & disposing

```ts
const system = particleManager.getSystem("campfire"); // ParticleSystem | undefined
particleManager.disposeSystem("campfire");
```

## One-Shot Effects

For short-lived effects like explosions or impacts, use the **template + spawn** pattern.

### 1. Register a template

```ts
await particleManager.registerTemplate("explosion", "/assets/particles/explosion.json");
```

This fetches the JSON once and caches it. No particle system is created yet.

### 2. Spawn effects

```ts
const system = particleManager.spawnEffect("explosion", scene, {
    position: new Vector3(-4, 1, 4),
    duration: 800, // stop emitting after 800 ms, then fade out
});
```

The system starts immediately, stops emitting after `duration` milliseconds, and auto-disposes once all remaining particles have died.

Spawn as many as you need — each call creates an independent system:

```ts
particleManager.spawnEffect("explosion", scene, {
    position: new Vector3(4, 1, -3),
    duration: 500,
});
```

### SpawnEffectOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `position` | `Vector3` | *required* | World position to spawn at |
| `textureUrl` | `string` | — | Override particle texture |
| `capacity` | `number` | `1000` | Max particle count |
| `duration` | `number` | `1000` | Milliseconds before stopping emission |
| `emitter` | `AbstractMesh \| Vector3` | — | Override emitter (defaults to `position`) |
| `targetStopDuration` | `number` | — | For burst effects, set to particle count |

### Checking templates

```ts
particleManager.hasTemplate("explosion"); // true
```

## Creating Particle JSON Files

1. Open the [BabylonJS Particle Editor](https://particles.babylonjs.com/).
2. Design your particle system.
3. Export as JSON.
4. Place the file in `public/assets/particles/`.

## Disposal

```ts
particleManager.dispose(); // stops and disposes all persistent systems + clears templates
```
