# AnimationManager

The `AnimationManager` handles three categories of animation, all driven by the core BabylonJS animation system so they stay in sync with the engine render loop.

| Category | Use case | API |
|---|---|---|
| **GLB animations** | Skeletal / transform animations baked in .glb files | `registerGLBAnimations`, `playGLB`, `stopGLB`, `crossFadeGLB` |
| **Coded tweens** | Move, rotate, scale, fade any property from code | `tween`, `stopTween` |
| **Shader transitions** | Full-screen or per-mesh shader effects (fades, dissolves …) | `shaderTransition`, `shaderMeshTransition` |

Every animation is stored under a unique **key** and can be retrieved (`get`), checked (`has`), stopped (`stop`), or bulk-disposed (`dispose`).

---

## Setup

The `AnimationManager` is created automatically by `Game` and exposed as `game.animationManager`.
Inside a `GameScene` it is available via `this.game.animationManager`:

```ts
// src/scenes/MyScene.ts
export class MyScene extends GameScene {
    public async setup(): Promise<void> {
        const result = await this.game.assetManager.loadModel("hero", "/assets/models/", "hero.glb", this.scene);
        this.game.animationManager.registerGLBAnimations("hero", result.animationGroups);
        this.game.animationManager.playGLB("hero_Idle", true);
    }
}
```

---

## 1. GLB Animations

When you load a `.glb` file via `assetManager.loadModel`, the resulting `AssetContainer` includes animation groups. Register them with the manager, then play by key.

```ts
import { AssetContainer } from "@babylonjs/core";

public async setup(): Promise<void> {
    const container = await this.game.assetManager.loadModel("hero", "/assets/models/", "hero.glb", this.scene);
    const entries = this.game.assetManager.instantiate("hero");

    // Register all animation groups under the prefix "hero"
    // Creates keys like "hero_Idle", "hero_Run", "hero_Attack"
    this.game.animationManager.registerGLBAnimations("hero", container.animationGroups);

    // Play the idle animation (looping)
    this.game.animationManager.playGLB("hero_Idle", true);

    // Later, switch to run with a 0.3 s blend-in
    this.game.animationManager.playGLB("hero_Run", true, 1, undefined, undefined, 0.3);

    // Or cross-fade from one to another over 0.5 s
    this.game.animationManager.crossFadeGLB("hero_Idle", "hero_Run", 0.5);

    // Stop
    this.game.animationManager.stopGLB("hero_Run");
}
```

### `playGLB` parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `key` | `string` | — | Registered animation key |
| `loop` | `boolean` | `true` | Loop the animation |
| `speed` | `number` | `1` | Playback speed multiplier |
| `from` | `number?` | group default | Start frame |
| `to` | `number?` | group default | End frame |
| `blendIn` | `number` | `0` | Weight blend-in time in seconds |

---

## 2. Coded Tweens

Animate any numeric, `Vector3`, or `Color3` property using the BabylonJS `Animation` API. Supports easing functions and looping.

```ts
import { CubicEase, EasingFunction, Vector3 } from "@babylonjs/core";

const ease = new CubicEase();
ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
const animationManager = this.game.animationManager;

// Float tween — bob a mesh up and down
animationManager.tween(
    "enemy_hover",
    enemyMesh,
    "position.y",
    0.75,
    2.5,
    this.scene,
    { duration: 2000, loop: true, easingFunction: ease },
);

// Vector3 tween — move to a target position
animationManager.tween(
    "move_to_door",
    playerMesh,
    "position",
    playerMesh.position.clone(),
    new Vector3(10, 0, 5),
    this.scene,
    { duration: 1000, onComplete: () => console.log("arrived!") },
);

// Stop a tween
animationManager.stopTween("enemy_hover");
```

### `TweenOptions`

| Field | Type | Default | Description |
|---|---|---|---|
| `duration` | `number` | — | Duration in milliseconds |
| `easingFunction` | `EasingFunction?` | none | BabylonJS easing function |
| `fps` | `number` | `60` | Animation frame rate |
| `loop` | `boolean` | `false` | Loop the tween |
| `onComplete` | `() => void` | — | Callback when finished |

---

## 3. Shader Transitions

### Full-screen post-process

Attach a fragment shader to the camera. The `progress` uniform is animated from `0` to `1` over the specified duration, then the post-process auto-disposes.

```ts
// Fade-in from black
animationManager.shaderTransition(
    "fadeIn",
    `
    precision highp float;
    varying vec2 vUV;
    uniform sampler2D textureSampler;
    uniform float progress;
    void main(void) {
        gl_FragColor = texture2D(textureSampler, vUV) * progress;
    }
    `,
    scene,
    { duration: 1500 },
);
```

### Per-mesh shader transition

Apply a custom vertex + fragment shader to a specific mesh. The original material is restored when the transition completes.

```ts
const vertexSrc = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 worldViewProjection;
    uniform float progress;
    varying vec2 vUV;
    void main(void) {
        vec3 p = position;
        p.y += sin(progress * 3.14159) * 0.5;
        gl_Position = worldViewProjection * vec4(p, 1.0);
        vUV = uv;
    }
`;

const fragmentSrc = `
    precision highp float;
    uniform float progress;
    varying vec2 vUV;
    void main(void) {
        gl_FragColor = vec4(vUV, progress, 1.0);
    }
`;

animationManager.shaderMeshTransition(
    "dissolve_enemy",
    enemyMesh,
    vertexSrc,
    fragmentSrc,
    scene,
    { duration: 1000, onComplete: () => enemyMesh.dispose() },
);
```

### `ShaderTransitionOptions`

| Field | Type | Default | Description |
|---|---|---|---|
| `duration` | `number` | — | Duration in milliseconds |
| `fps` | `number` | `60` | Animation frame rate |
| `easingFunction` | `EasingFunction?` | none | Easing for the progress curve |
| `onComplete` | `() => void` | — | Callback when finished |

---

## Generic helpers

```ts
// Check if an animation exists
animationManager.has("enemy_hover"); // true

// Get the managed entry (includes animationGroup / animatable / postProcess)
const entry = animationManager.get("enemy_hover");

// Stop and dispose a single animation
animationManager.stop("enemy_hover");

// Dispose everything
animationManager.dispose();
```
