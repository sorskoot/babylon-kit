# BJS Game Engine

A lightweight, modular game engine layer on top of [Babylon.js](https://www.babylonjs.com/). Provides the "game engine plumbing" — ECS, game loop, input, assets, audio, physics, scenes, and debug tools — so you can focus on building games.

## Quick Start

```bash
npm install
npm run dev
```

```typescript
import { GameEngine, Component, System } from "./src/engine";

const game = new GameEngine({ debug: true });

class Health extends Component {
    hp = 100;
}

class DamageSystem extends System {
    readonly name = "damage";
    update(delta: number) { /* ... */ }
}

game.registerSystem(new DamageSystem());
const player = game.createEntity("Player");
player.addComponent(new Health());

game.start();
```

## Architecture

```
src/engine/
  core/         — Engine, GameLoop, Entity, Component, System, types
  services/
    input/      — Keyboard, mouse, gamepad, action mapping
    assets/     — Async loading, caching, manifests
    audio/      — Web Audio API, groups, spatial audio
    physics/    — Rigid bodies, colliders, raycasting (Havok-ready)
    scenes/     — Scene stack, transitions
  debug/        — FPS overlay, stats
```

## Running Tests

```bash
npm test               # single run
npm run test:watch     # watch mode
npm run test:coverage  # with coverage
```

## Samples

| Sample | Description |
|--------|-------------|
| [basic-setup](samples/basic-setup/) | Minimal engine + Babylon.js scene |
| [input-demo](samples/input-demo/) | WASD movement with action mapping |
| [ecs-demo](samples/ecs-demo/) | Multiple entities with spinner and bobber components |
| [scene-management](samples/scene-management/) | Scene loading and switching |

## Documentation

- [Engine Core](docs/engine-core.md) — Bootstrapping, game loop, time management
- [ECS](docs/ecs.md) — Entities, components, systems
- [Input System](docs/input.md) — Keyboard, mouse, gamepad, actions
- [Asset Pipeline](docs/assets.md) — Loading, caching, manifests
- [Audio](docs/audio.md) — Sound playback, groups, volume
- [Physics](docs/physics.md) — Rigid bodies, colliders, raycasting
- [Scene Management](docs/scenes.md) — Scene stack, transitions
- [Debug Tools](docs/debug.md) — FPS overlay, stats

## License

MIT
