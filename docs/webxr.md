# WebXR

`XRManager` wraps BabylonJS `WebXRDefaultExperience` to provide VR session management, controller input, and teleportation.

## Checking Support

```ts
const supported = await XRManager.isSupported();
```

Returns `true` if the browser supports `immersive-vr` WebXR sessions.

## Initializing XR

Call `initializeXR()` on your `GameScene` after the camera and environment are ready (typically at the end of `setup()`). You choose **either** teleportation **or** smooth locomotion via the `movement` option — they are mutually exclusive.

This adds a VR enter button to the page automatically.

### Teleportation

```ts
await this.initializeXR({
    movement: {
        mode: "teleportation",
        floorMeshes: [ground],
        timeToTeleport: 3000,
        // optional:
        // renderingGroupId: 1,
        // teleportationTargetMesh: myCustomMesh,
    },
});
```

### Smooth locomotion

```ts
await this.initializeXR({
    movement: {
        mode: "locomotion",
        movementSpeed: 0.1,
        // optional:
        // movementOrientationFollowsViewerPose: true,
        // movementOrientationFollowsController: false,
    },
});
```

### No movement

If you omit `movement`, XR is initialised without any movement feature:

```ts
await this.initializeXR();
```

### XRManagerOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `movement` | `TeleportationMovement \| LocomotionMovement` | — | Movement mode (see below) |
| `disablePointerSelection` | `boolean` | `false` | Disable pointer/ray selection |
| `disableNearInteraction` | `boolean` | `false` | Disable near grab interaction |
| `experienceOptions` | `Partial<WebXRDefaultExperienceOptions>` | — | Additional options forwarded to BabylonJS |

### TeleportationMovement

Set `mode: "teleportation"` to enable point-and-teleport movement.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `"teleportation"` | — | **Required** discriminant |
| `floorMeshes` | `AbstractMesh[]` | — | **Required** — meshes the player can teleport onto |
| `renderingGroupId` | `number` | — | Rendering group for the teleportation indicator |
| `timeToTeleport` | `number` | `3000` | Time in ms to hold before teleport triggers |
| `teleportationTargetMesh` | `AbstractMesh` | — | Custom mesh for the teleportation target indicator |

### LocomotionMovement

Set `mode: "locomotion"` to enable thumbstick-based smooth movement.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `"locomotion"` | — | **Required** discriminant |
| `movementSpeed` | `number` | `0.1` | Movement speed in units/frame |
| `movementOrientationFollowsViewerPose` | `boolean` | `true` | Movement direction follows headset orientation |
| `movementOrientationFollowsController` | `boolean` | `false` | Movement direction follows controller orientation |

## Controller Input

### Reacting to controller buttons

```ts
this.xrManager.onMotionControllerReady((motionController, inputSource) => {
    const trigger = motionController.getMainComponent();
    if (trigger) {
        trigger.onButtonStateChangedObservable.add((component) => {
            if (component.pressed) {
                console.log(`Trigger pressed on ${motionController.handedness}`);
            }
        });
    }
});
```

### Controller events

| Observable | Fires when |
|------------|-----------|
| `xrManager.onControllerAdded` | A new XR controller connects |
| `xrManager.onControllerRemoved` | An XR controller disconnects |
| `xrManager.onStateChanged` | XR state changes (entering, in, exiting, not in XR) |

### Getting connected controllers

```ts
const controllers = this.xrManager.getControllers(); // WebXRInputSource[]
```

## Session Control

### Enter / exit programmatically

```ts
await this.xrManager.enterXR();
await this.xrManager.exitXR();
```

### Checking session state

```ts
if (this.xrManager.isInXR()) {
    // currently in VR
}
```

### Accessing the underlying experience

```ts
const xr = this.xrManager.getExperience(); // WebXRDefaultExperience | null
```

## Disposal

XR is disposed automatically when the `GameScene` is disposed. You can also call:

```ts
this.xrManager.dispose();
```
