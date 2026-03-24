import type { WebXRInputSource } from '@babylonjs/core/XR/webXRInputSource';
import { Component } from '../core/component';

/**
 * Which hand (controller) to track.
 */
export type XRHandedness = 'left' | 'right';

/**
 * Which part of the controller to use as the tracking origin.
 *
 * - `grip`    — The physical grip of the controller. Best for objects "held" in the hand.
 * - `pointer` — The aiming/ray origin. Best for laser-pointer style interactions.
 */
export type XRTrackingSpace = 'grip' | 'pointer';

/**
 * Attach to an entity to make its mesh follow or replace a VR controller.
 *
 * Pair with a {@link MeshComponent} (URL-loaded or direct mesh) and register
 * {@link XRControllerSystem} to have the entity's mesh automatically parented
 * to the matching WebXR controller anchor each frame.
 *
 * Set {@link hideControllerMesh} to `true` to hide the default controller
 * model rendered by the WebXR experience, effectively **replacing** it with
 * your own mesh.
 *
 * @example
 * ```ts
 * // Follow the right-hand controller grip with a custom model
 * const rightHand = game.createEntity('RightHand');
 * rightHand.addComponent(new MeshComponent({ url: 'hand.glb' }));
 * rightHand.addComponent(new XRControllerComponent({
 *     hand: 'right',
 *     trackingSpace: 'grip',
 *     hideControllerMesh: true, // hide the default controller model
 * }));
 * ```
 */
export class XRControllerComponent extends Component {
    /**
     * Which hand (controller) to track.
     * @defaultValue `'right'`
     */
    hand: XRHandedness;

    /**
     * Which part of the controller to anchor the entity's mesh to.
     * @defaultValue `'grip'`
     */
    trackingSpace: XRTrackingSpace;

    /**
     * When `true`, the default controller model rendered by the WebXR
     * experience is hidden so only the entity's own mesh is visible.
     * This effectively **replaces** the controller model.
     * @defaultValue `false`
     */
    hideControllerMesh: boolean;

    /**
     * The resolved WebXR input source.
     * Set automatically by {@link XRControllerSystem} when the controller connects.
     * `undefined` until a matching controller is found.
     * @internal
     */
    inputSource?: WebXRInputSource;

    constructor(options: {
        hand?: XRHandedness;
        trackingSpace?: XRTrackingSpace;
        hideControllerMesh?: boolean;
    } = {}) {
        super();
        this.hand = options.hand ?? 'right';
        this.trackingSpace = options.trackingSpace ?? 'grip';
        this.hideControllerMesh = options.hideControllerMesh ?? false;
    }
}

