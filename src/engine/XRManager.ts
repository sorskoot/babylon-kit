import {
    AbstractMesh,
    Scene,
    WebXRDefaultExperience,
    WebXRDefaultExperienceOptions,
    WebXRFeatureName,
    WebXRState,
    WebXRInputSource,
    WebXRAbstractMotionController,
    Observable,
} from "@babylonjs/core";

/** Options for teleportation movement mode. */
export interface TeleportationMovement {
    mode: "teleportation";
    /** Meshes the player can teleport onto. */
    floorMeshes: AbstractMesh[];
    /** Rendering group used for the teleportation indicator. */
    renderingGroupId?: number;
    /** Time (ms) to hold before teleport triggers. Default 3000. */
    timeToTeleport?: number;
    /** Custom mesh used as the teleportation target indicator. */
    teleportationTargetMesh?: AbstractMesh;
}

/** Options for smooth locomotion movement mode. */
export interface LocomotionMovement {
    mode: "locomotion";
    /** Movement direction follows the headset orientation. Default true. */
    movementOrientationFollowsViewerPose?: boolean;
    /** Movement direction follows the controller orientation. Default false. */
    movementOrientationFollowsController?: boolean;
    /** Movement speed in units/frame. Default 0.1. */
    movementSpeed?: number;
}

export interface XRManagerOptions {
    /** Choose either teleportation or smooth locomotion. */
    movement?: TeleportationMovement | LocomotionMovement;
    /** Disable pointer selection. */
    disablePointerSelection?: boolean;
    /** Disable near interaction (grab). */
    disableNearInteraction?: boolean;
    /** Additional options forwarded to WebXRDefaultExperience. */
    experienceOptions?: Partial<WebXRDefaultExperienceOptions>;
}

/**
 * Manages WebXR session lifecycle, input, and common XR features.
 * Wraps BabylonJS WebXRDefaultExperience for easy integration.
 */
export class XRManager {
    private xr: WebXRDefaultExperience | null = null;
    private scene: Scene;

    /** Fires when XR state changes (ENTERING_XR, IN_XR, EXITING_XR, NOT_IN_XR). */
    public readonly onStateChanged: Observable<WebXRState> = new Observable<WebXRState>();

    /** Fires when a new XR controller is added. */
    public readonly onControllerAdded: Observable<WebXRInputSource> = new Observable<WebXRInputSource>();

    /** Fires when an XR controller is removed. */
    public readonly onControllerRemoved: Observable<WebXRInputSource> = new Observable<WebXRInputSource>();

    constructor(scene: Scene) {
        this.scene = scene;
    }

    /**
     * Check whether the browser supports immersive-vr WebXR sessions.
     */
    public static async isSupported(): Promise<boolean> {
        if (!navigator.xr) return false;
        try {
            return await navigator.xr.isSessionSupported("immersive-vr");
        } catch {
            return false;
        }
    }

    /**
     * Initialise the WebXR default experience.
     * Call this after the scene's camera and environment are ready.
     *
     * Movement is configured via `options.movement`:
     * - `{ mode: "teleportation", floorMeshes, ... }` enables teleportation.
     * - `{ mode: "locomotion", movementSpeed, ... }` enables smooth locomotion.
     * - If omitted, no movement feature is enabled.
     */
    public async initialize(options: XRManagerOptions = {}): Promise<WebXRDefaultExperience> {
        const expOptions: WebXRDefaultExperienceOptions = {
            // Always disable built-in teleportation; we manage movement ourselves.
            disableTeleportation: true,
            disablePointerSelection: options.disablePointerSelection ?? false,
            disableNearInteraction: options.disableNearInteraction ?? false,
            ...options.experienceOptions,
        };

        this.xr = await this.scene.createDefaultXRExperienceAsync(expOptions);

        // --- movement feature ---------------------------------------------------
        if (options.movement) {
            const fm = this.xr.baseExperience.featuresManager;

            if (options.movement.mode === "teleportation") {
                const t = options.movement;
                fm.enableFeature(WebXRFeatureName.TELEPORTATION, "stable", {
                    xrInput: this.xr.input,
                    floorMeshes: t.floorMeshes,
                    renderingGroupId: t.renderingGroupId,
                    timeToTeleport: t.timeToTeleport,
                    teleportationTargetMesh: t.teleportationTargetMesh,
                });
            } else if (options.movement.mode === "locomotion") {
                const l = options.movement;
                fm.enableFeature(WebXRFeatureName.MOVEMENT, "latest", {
                    xrInput: this.xr.input,
                    movementOrientationFollowsViewerPose:
                        l.movementOrientationFollowsViewerPose ?? true,
                    movementOrientationFollowsController:
                        l.movementOrientationFollowsController ?? false,
                    movementSpeed: l.movementSpeed ?? 0.1,
                });
            }
        }

        // Relay state changes
        this.xr.baseExperience.onStateChangedObservable.add((state) => {
            this.onStateChanged.notifyObservers(state);
        });

        // Relay controller events
        this.xr.input.onControllerAddedObservable.add((controller) => {
            this.onControllerAdded.notifyObservers(controller);
        });

        this.xr.input.onControllerRemovedObservable.add((controller) => {
            this.onControllerRemoved.notifyObservers(controller);
        });

        return this.xr;
    }

    /** Get the underlying WebXRDefaultExperience (null before initialize). */
    public getExperience(): WebXRDefaultExperience | null {
        return this.xr;
    }

    /** Whether an XR session is currently active. */
    public isInXR(): boolean {
        if (!this.xr) return false;
        return this.xr.baseExperience.state === WebXRState.IN_XR;
    }

    /** Get all currently connected XR input sources. */
    public getControllers(): WebXRInputSource[] {
        if (!this.xr) return [];
        return this.xr.input.controllers;
    }

    /**
     * Register a callback for when a motion controller's components are ready.
     * Useful for binding button/trigger/grip events.
     */
    public onMotionControllerReady(
        callback: (motionController: WebXRAbstractMotionController, inputSource: WebXRInputSource) => void
    ): void {
        this.onControllerAdded.add((controller) => {
            if (controller.motionController) {
                callback(controller.motionController, controller);
            } else {
                controller.onMotionControllerInitObservable.addOnce((mc) => {
                    callback(mc, controller);
                });
            }
        });
    }

    /** Enter XR session programmatically (the VR button also works). */
    public async enterXR(): Promise<void> {
        if (!this.xr) throw new Error("XRManager not initialized. Call initialize() first.");
        await this.xr.baseExperience.enterXRAsync("immersive-vr", "local-floor");
    }

    /** Exit the current XR session. */
    public async exitXR(): Promise<void> {
        if (!this.xr) return;
        await this.xr.baseExperience.exitXRAsync();
    }

    /** Disposes the WebXR experience and clears all observables. */
    public dispose(): void {
        if (this.xr) {
            this.xr.dispose();
            this.xr = null;
        }
        this.onStateChanged.clear();
        this.onControllerAdded.clear();
        this.onControllerRemoved.clear();
    }
}
