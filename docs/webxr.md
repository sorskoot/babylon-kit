# WebXR

`XRManager` wraps BabylonJS `WebXRDefaultExperience` to provide VR session management, controller input, and teleportation.

## Checking Support

```ts
const supported = await XRManager.isSupported();
```

Returns `true` if the browser supports `immersive-vr` WebXR sessions.

## Initializing XR

Call `initializeXR()` on your `GameScene` after the camera and environment are ready (typically at the end of `setup()`):

```ts
if (await XRManager.isSupported()) {
    await this.initializeXR({
        floorMeshes: [ground],
        disableTeleportation: false,
    });
}
```

This adds a VR enter button to the page automatically.

### XRManagerOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `floorMeshes` | `Mesh[]` | — | Meshes used for teleportation |
| `disableTeleportation` | `boolean` | `true` | Disable teleportation |
| `disablePointerSelection` | `boolean` | `false` | Disable pointer/ray selection |
| `disableNearInteraction` | `boolean` | `false` | Disable near grab interaction |
| `experienceOptions` | `Partial<WebXRDefaultExperienceOptions>` | — | Additional options forwarded to BabylonJS |

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
