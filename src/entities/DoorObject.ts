import {TransformNode, Vector3} from '@babylonjs/core';
import {DoorTweenAnimator} from '../controllers/DoorAnimationController';
import type {IOpenCloseAnimator} from '../controllers/IOpenCloseAnimator';
import {GameObject} from '../engine/GameObject';
import {GameScene} from '../engine/GameScene';

/** Configuration options for a {@link DoorObject}. */
export type DoorObjectOptions = {
    /**
     * Animation duration in seconds. Default `0.6`.
     */
    speed?: number;

    /**
     * When `true`, the door swings in the opposite (negative Y-rotation) direction.
     */
    reversed?: boolean;

    /**
     * When `true`, the door ignores interaction and cannot be opened.
     */
    locked?: boolean,

    /**
     * Maximum open amount as a fraction of 90°.
     * `1` (default) = 90°, `0.5` = 45°.
     */
    max?: number,

}

/**
 * A {@link GameObject} that represents an animated door.
 *
 * When interacted with (via pointer click or {@link InputManager} action),
 * the door rotates on the Y axis between its closed (0°) and open positions
 * using the {@link AnimationManager} tween API.
 *
 * Doors are created automatically by {@link GameScene} for every node in the
 * {@link MetadataRepository} that carries a `door` metadata block.  You can
 * also instantiate them directly:
 *
 * @example
 * ```ts
 * const doorObj = new DoorObject("frontDoor", this, doorMesh, { reversed: true });
 * this.addGameObject("frontDoor", doorObj);
 * this.interactionManager.enableInteraction(doorObj);
 * ```
 */
export class DoorObject extends GameObject {

    private readonly speed: number;
    private readonly reversed: boolean;
    private locked: boolean;
    private readonly max: number;
    private readonly animator: IOpenCloseAnimator;

    /**
     * @param name    Unique name for this door within the scene.
     * @param scene   The owning {@link GameScene}.
     * @param mesh    The {@link TransformNode} that will be rotated.
     * @param options Optional configuration (speed, direction, locked state, max angle).
     */
    constructor(name: string,
                scene: GameScene,
                mesh: TransformNode,
                options?: DoorObjectOptions) {
        super(name, scene);
        this.node = mesh;
        this.speed = options?.speed ?? 0.6;
        this.reversed = options?.reversed ?? false;
        this.locked = options?.locked ?? false;
        this.max = options?.max ?? 1.0;

        if (!this.node!.rotation) {
            this.node!.rotation = new Vector3(0, 0, 0);
        }

        const openAngle = (this.reversed ? -1 : 1) * this.max * Math.PI / 2;
        const durationMs = this.speed * 1000;

        // create a tween-based animator for this door using the scene's animationManager
        this.animator = new DoorTweenAnimator(this.game.animationManager, mesh, openAngle, durationMs, `${name}_OpenClose`);
    }

    /** @inheritdoc */
    public onStart(): void {
    }

    /** @inheritdoc */
    public onUpdate(_deltaTime: number): void {
    }

    /**
     * Called when the player interacts with the door.
     * Toggles between the open and closed states via the animator.
     * Does nothing when the door is {@link locked}.
     */
    public onInteract(): void {
        if (this.locked) {
            // can't open locked door
            return;
        }

        if (this.animator) {
            try {
                this.animator.toggle();
            } catch (e) {
                console.warn(`[DoorObject] animator.toggle() failed for ${this.name}`, e);
            }
            return;
        }

        // fallback immediate rotation
        this.node!.rotation.set(0, (this.reversed ? -1 : 1) * this.max * Math.PI / 2, 0);
    }

    /**
     * Locks the door so that interaction no longer opens it.
     * If the door is currently open the animator will close it.
     */
    public lock() {
        if (!this.locked) {
            // if an animator exists, play close when locking
            this.animator?.close?.();
        }
        this.locked = true;
    }

    /**
     * Unlocks the door so that it can once again be opened via interaction.
     * Also disposes the current animator so the door is fully reset.
     */
    public unlock() {
        this.locked = false;
        this.animator?.dispose?.();
    }
}