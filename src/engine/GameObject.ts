import { AbstractMesh, Scene, Vector3 } from "@babylonjs/core";

export abstract class GameObject {
    public name: string;
    public mesh: AbstractMesh | null = null;
    public tags: Set<string> = new Set();

    protected scene: Scene;
    private _enabled: boolean = true;

    constructor(name: string, scene: Scene) {
        this.name = name;
        this.scene = scene;
    }

    public get enabled(): boolean {
        return this._enabled;
    }

    public set enabled(value: boolean) {
        this._enabled = value;
        if (this.mesh) {
            this.mesh.setEnabled(value);
        }
    }

    public get position(): Vector3 {
        return this.mesh?.position ?? Vector3.Zero();
    }

    public set position(value: Vector3) {
        if (this.mesh) {
            this.mesh.position = value;
        }
    }

    public hasTag(tag: string): boolean {
        return this.tags.has(tag);
    }

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

    public dispose(): void {
        if (this.mesh) {
            this.mesh.dispose();
            this.mesh = null;
        }
    }
}
