import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { System } from '../core/system';
import type { IGameEngine } from '../core/types';
import { XRControllerComponent } from '../components/xrControllerComponent';
import { MeshComponent } from '../components/meshComponent';
import {WebXRInputSource, WebXRCamera, WebXRState} from "@babylonjs/core";


/**
 * Matches entities that have an {@link XRControllerComponent} to the
 * corresponding WebXR controller and parents the entity's mesh to that
 * controller anchor so it follows (or replaces) it in world space.
 *
 * @remarks
 * - Requires the engine to have been initialized with WebXR enabled
 *   (the default: `config.webXR !== false`).
 * - When used together with a {@link MeshComponent}, the entity's
 *   `rootNode` is parented to the controller's grip or pointer anchor
 *   as soon as both the mesh has loaded **and** the matching controller
 *   is connected.
 * - {@link XRControllerComponent.hideControllerMesh | hideControllerMesh}
 *   hides the built-in controller model so only your mesh is visible.
 * - Controller disconnect is detected automatically; the component's
 *   `inputSource` is cleared, and the entity will re-attach to the next
 *   controller that connects with the matching handedness.
 *
 * Register once, then add {@link XRControllerComponent} to any entities
 * you want to attach to controllers.
 *
 * @example
 * ```ts
 * game.registerSystem(new XRControllerSystem());
 *
 * // Replace the right controller with a custom hand model
 * const rightHand = game.createEntity('RightHand');
 * rightHand.addComponent(new MeshComponent({ url: 'hand.glb' }));
 * rightHand.addComponent(new XRControllerComponent({
 *     hand: 'right',
 *     hideControllerMesh: true,
 * }));
 *
 * // Attach a glowing orb to the left pointer ray origin
 * const leftOrb = game.createEntity('LeftOrb');
 * leftOrb.addComponent(new MeshComponent({ url: 'orb.glb' }));
 * leftOrb.addComponent(new XRControllerComponent({
 *     hand: 'left',
 *     trackingSpace: 'pointer',
 * }));
 * ```
 */
export class XRControllerSystem extends System {
    readonly name = 'xrController';

    private _engine!: IGameEngine;

    /**
     * Entity IDs whose mesh root has already been parented to a controller
     * anchor. Cleared when the controller disconnects, so re-attachment
     * occurs automatically.
     */
    private readonly _attached = new Set<number>();

    /**
     * Tracks the currently connected XR controllers by their `uniqueId`.
     *
     * @remarks
     * This registry is maintained for future functionality (for example,
     * global access to controllers, haptics, or cross-system coordination),
     * and is not yet read elsewhere in the engine.
     */
    private _controllers: Map<string, WebXRInputSource> = new Map();

    constructor() {
        // Run after MeshLoaderSystem (-100) so meshes are ready, but
        // well before gameplay systems (typically 10+).
        super(-50);
    }

    override onRegister(engine: IGameEngine): void {
        this._engine = engine;
        this._engine.onXRStateChanged.add(this._onXRStateChange);
        this._engine.onXRInitialPose.add(this._onXRInitialPose);
    }

    override onUnregister(): void {
        // Re-enable any controller meshes that were hidden by this system.
        const xr = this._engine?.xr;
        if (!xr) return;
        for (const entity of this._engine.getEntitiesWithComponent(XRControllerComponent)) {
            const xrComp = entity.getComponent(XRControllerComponent);
            if (!xrComp?.hideControllerMesh || !xrComp.inputSource) continue;
            const rootMesh = xrComp.inputSource.motionController?.rootMesh;
            rootMesh?.setEnabled(true);
        }

        this._engine.onXRStateChanged.removeCallback(this._onXRStateChange);
        this._engine.onXRInitialPose.removeCallback(this._onXRInitialPose);
    }

    update(_delta: number): void {
        const xr = this._engine.xr;
        if (!xr) return;

        for (const entity of this._engine.getEntitiesWithComponent(XRControllerComponent)) {
            const xrComp = entity.getComponent(XRControllerComponent)!;

            if (xrComp.inputSource) {
                // Verify the controller is still connected.
                if (!xr.input.controllers.includes(xrComp.inputSource)) {
                    xrComp.inputSource = undefined;
                    this._attached.delete(entity.id);
                }
            }

            if (!xrComp.inputSource) {
                // Try to find the matching controller.
                xrComp.inputSource = xr.input.controllers.find(
                    (c) => c.inputSource.handedness === xrComp.hand,
                );
                if (!xrComp.inputSource) continue;
            }

            const inputSource = xrComp.inputSource;

            // Controller anchor
            const anchor: AbstractMesh | null | undefined =
                xrComp.trackingSpace === 'grip'
                    ? inputSource.grip
                    : inputSource.pointer;

            if (!anchor) continue;

            if (xrComp.hideControllerMesh) {
                const rootMesh = inputSource.motionController?.rootMesh;
                if (rootMesh?.isEnabled()) {
                    rootMesh.setEnabled(false);
                }
            }

            // Parent entity mesh to controller anchor
            if (this._attached.has(entity.id)) continue;

            const mc = entity.getComponent(MeshComponent);
            if (!mc || mc.state !== 'loaded' || !mc.rootNode) continue;

            // Parent directly (preserving local transforms as-is so that
            // the node's local space now lives inside the controller anchor).
            mc.rootNode.parent = anchor;

            // Reset the root-node position so the mesh sits exactly at the
            // anchor origin. Any MeshComponent position/rotation options are
            // then re-applied as local offsets relative to the controller.
            mc.rootNode.position.set(0, 0, 0);

            // If the root node uses quaternion rotation, clear it so that
            // later euler-based applyTransforms calls work correctly.
            if (mc.rootNode.rotationQuaternion) {
                mc.rootNode.rotationQuaternion = null;
                mc.rootNode.rotation.set(0, 0, 0);
            }

            // Re-apply configured offsets (position / rotation / scaling) as
            // local transforms relative to the controller anchor.
            mc.applyTransforms();
            this._attached.add(entity.id);
        }
    }

    private _onXRStateChange = (state: WebXRState) => {
        // if (state === WebXRState.ENTERING_XR) {
        //     // Reset controller tracking state when entering XR; controllers
        //     // will be re-populated via the input observables.
        //     this._controllers.clear();
        //     this._attached.clear();
        // }
        if (state === WebXRState.EXITING_XR) {
            // Stop tracking controllers and clear the attachment state when
            // exiting XR to avoid holding stale references.
            this._controllers.clear();
            this._attached.clear();
        }
        // if (state === WebXRState.ENTERING_XR) {
        //
        //     // start tracking controllers
        // }
        // if (state === WebXRState.EXITING_XR) {
        //     // stop/pause tracking controllers
        // }
    }
    private _onXRInitialPose = (_camera:WebXRCamera) => {
        this._engine.xr?.input?.onControllerAddedObservable.add((s)=>{
            this._controllers.set(s.uniqueId,s);
        });

        this._engine.xr?.input?.onControllerRemovedObservable.add((s)=>{
            this._controllers.delete(s.uniqueId);
        });
    }
}

