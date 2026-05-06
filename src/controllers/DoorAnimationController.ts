import {EasingFunction, SineEase, TransformNode, Vector3} from '@babylonjs/core';
import {AnimationManager} from '../engine/AnimationManager';
import type {IOpenCloseAnimator} from './IOpenCloseAnimator';

/**
 * Implements {@link IOpenCloseAnimator} for a door node using
 * {@link AnimationManager} property tweens.
 *
 * The door's Y rotation is tweened between `0` (closed) and `openAngle`
 * (open) over `durationMs` milliseconds with a sine ease-in-out curve.
 * Repeated interactions while the animation is running are ignored.
 *
 * @example
 * ```ts
 * const animator = new DoorTweenAnimator(
 *     game.animationManager,
 *     doorMesh,
 *     Math.PI / 2,   // 90° open angle
 *     600,           // 600 ms duration
 *     "frontDoor",
 * );
 * animator.open();
 * ```
 */
export class DoorTweenAnimator implements IOpenCloseAnimator {
    private animationManager: AnimationManager;
    private readonly node: TransformNode;
    private readonly openAngle: number;
    private readonly durationMs: number;
    private readonly keyPrefix: string;
    private animating = false;
    private openState = false;

    /**
     * @param animationManager - The shared {@link AnimationManager} used to run tweens.
     * @param node             - The {@link TransformNode} whose Y rotation is animated.
     * @param openAngle        - Target Y rotation in radians when fully open.
     * @param durationMs       - Animation duration in milliseconds. Default `600`.
     * @param keyPrefix        - Prefix for animation keys registered in the manager.
     *                           Defaults to `"door_<nodeName>"`.
     */
    constructor(animationManager: AnimationManager, node: TransformNode, openAngle: number, durationMs = 600, keyPrefix?: string) {
        this.animationManager = animationManager;
        this.node = node;
        this.openAngle = openAngle;
        this.durationMs = durationMs;
        this.keyPrefix = keyPrefix ?? `door_${node.name ?? Math.random().toString(36).slice(2)}`;
    }

    /** Returns `true` when the door is currently in (or moving toward) the open state. */
    isOpen(): boolean {
        return this.openState;
    }

    /** Animates the door to the open position. No-op if already open or animating. */
    open(): void {
        if (this.openState || this.animating) return;
        this.playTo(this.openAngle, `${this.keyPrefix}_open`);
        this.openState = true;
    }

    /** Animates the door back to the closed (0°) position. No-op if already closed or animating. */
    close(): void {
        if (!this.openState || this.animating) return;
        this.playTo(0, `${this.keyPrefix}_close`);
        this.openState = false;
    }

    /**
     * Toggles between open and closed.
     * No-op while an animation is currently running.
     */
    toggle(): void {
        if (this.animating) {
            return;
        } // ignore while animating

        return this.openState ? this.close() : this.open();
    }

    /**
     * Stops any running open/close tweens and resets the animating flag.
     * Called automatically when the owning {@link DoorObject} is unloaded.
     */
    dispose(): void {
        // stop any running tween in the animation manager and clear flags
        this.animationManager.stop(`${this.keyPrefix}_open`);
        this.animationManager.stop(`${this.keyPrefix}_close`);
        this.animating = false;
    }

    /** @internal */
    private playTo(targetY: number, key: string): void {
        // If node uses rotationQuaternion, this simple rotation tween won't work.
        if ((this.node as any).rotationQuaternion) {
            // Convert quaternion to Euler as a fallback (destructive) and warn.
            console.warn(`[DoorTweenAnimator] node ${this.node.name} has rotationQuaternion — converting to Euler and removing quaternion.`);
            // This cast assumes Babylon's Quaternion has toEulerAngles method or similar — adapt if needed.
            // Safer: set rotation from rotationQuaternion.toEulerAngles() if available.
            try {
                const quat = (this.node as any).rotationQuaternion;
                if (quat && typeof quat.toEulerAngles === 'function') {
                    (this.node as any).rotation = quat.toEulerAngles();
                }
            } catch {
                // ignore
            }
            (this.node as any).rotationQuaternion = null;
        }

        // stop any existing tween with the same keys
        this.animationManager.stop(`${this.keyPrefix}_open`);
        this.animationManager.stop(`${this.keyPrefix}_close`);

        const from = this.node.rotation.clone();
        const to = new Vector3(from.x, targetY, from.z);

        this.animating = true;

        const ease = new SineEase();
        // set easing mode enum in a safe cast (TypeScript typings in some Babylon versions differ)
        try {
            (ease as any).setEasingMode((EasingFunction as any).EASINGMODE_EASEINOUT);
        } catch {
            // ignore if not available
        }

        this.animationManager.tween(
            key,
            this.node,
            'rotation',
            from,
            to,
            this.node.getScene()!, // scene required by tween()
            {
                duration:       this.durationMs,
                easingFunction: ease,
                onComplete:     () => {
                    // ensure final rotation applied
                    this.node.rotation.copyFrom(to);
                    this.animating = false;
                },
            },
        );

    }
}
