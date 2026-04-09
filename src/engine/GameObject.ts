import {Scene, TransformNode, Vector3} from '@babylonjs/core';

/**
 * Base class for all interactive objects in a {@link GameScene}.
 *
 * Subclasses implement {@link onStart} (called once after creation) and
 * {@link onUpdate} (called every frame).  Objects can be tagged for group
 * queries and are automatically updated by their parent scene each frame.
 *
 * @example
 * ```ts
 * class Crate extends GameObject {
 *     onStart() { this.addTag("prop"); }
 *     onUpdate(dt: number) { /* rotate * / }
 * }
 * ```
 */
export abstract class GameObject {
    /** Display name used for debugging and retrieval. */
    public name: string;
    /** The BabylonJS scene node that represents this object. */
    public node: TransformNode | null = null;
    /** Set of string tags for group queries (see {@link GameScene.getGameObjectsByTag}). */
    public tags: Set<string> = new Set();

    protected scene: Scene;
    private _enabled: boolean = true;

    /**
     * @param name  Human-readable identifier for this object.
     * @param scene The BabylonJS scene this object belongs to.
     */
    constructor(name: string, scene: Scene) {
        this.name = name;
        this.scene = scene;
    }

    /**
     * Whether this object is active.
     * Setting to `false` also disables the underlying scene node so it stops
     * being rendered and receiving updates.
     */
    public get enabled(): boolean {
        return this._enabled;
    }

    public set enabled(value: boolean) {
        this._enabled = value;
        if (this.node) {
            this.node.setEnabled(value);
        }
    }

    /**
     * World-space position of the underlying scene node.
     * Returns `Vector3.Zero()` when no node is attached.
     */
    public get position(): Vector3 {
        return this.node?.position ?? Vector3.Zero();
    }

    public set position(value: Vector3) {
        if (this.node) {
            this.node.position = value;
        }
    }

    /** Returns `true` if this object carries the given tag. */
    public hasTag(tag: string): boolean {
        return this.tags.has(tag);
    }

    /** Adds a tag to this object's tag set. */
    public addTag(tag: string): void {
        this.tags.add(tag);
    }

    /** Called once after the object is created and its mesh is assigned. */
    public abstract onStart(): void;

    /** Called every frame with the time since last frame in seconds. */
    public abstract onUpdate(deltaTime: number): void;

    /** Called when this object is interacted with (clicked/picked). */
    public onInteract(): void {
        // Override in subclass to handle interaction
    }

    /** Disposes the underlying scene node and nullifies the reference. */
    public dispose(): void {
        if (this.node) {
            this.node.dispose();
            this.node = null;
        }
    }
}
