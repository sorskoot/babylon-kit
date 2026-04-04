import type {AbstractMesh} from '@babylonjs/core/Meshes/abstractMesh';
import type {TransformNode} from '@babylonjs/core/Meshes/transformNode';
import {Component} from '../core/component';
import {Vector3} from "@babylonjs/core";

/** Loading lifecycle state for async components. */
export type LoadState = 'pending' | 'loading' | 'loaded' | 'error';

/** Options for loading a mesh from a URL. */
export interface MeshComponentUrlOptions {
    /** URL of the mesh file (glTF, glb, obj, etc.). */
    url: string;
    /**
     * Optional root path prepended to the filename when loading.
     * If omitted it is derived from {@link url} automatically.
     */
    rootUrl?: string;
    mesh?: never;
    /** Optional position to place the mesh at after loading. */
    position?: { x: number; y: number; z: number };
    /** Optional rotation (Euler angles in radians) to apply after loading. */
    rotation?: { x: number; y: number; z: number };
    /** Optional uniform or per-axis scale. */
    scaling?: number | { x: number; y: number; z: number };
}

/** Options for wrapping an already-created Babylon.js mesh. */
export interface MeshComponentMeshOptions {
    /** An existing Babylon.js mesh instance (e.g. from `MeshBuilder`). */
    mesh: AbstractMesh;
    url?: never;
    rootUrl?: never;
    /** Optional position to place the mesh at. */
    position?: { x: number; y: number; z: number };
    /** Optional rotation (Euler angles in radians) to apply. */
    rotation?: { x: number; y: number; z: number };
    /** Optional uniform or per-axis scale. */
    scaling?: number | { x: number; y: number; z: number };
}

/** Construction options — supply either a `url` *or* a `mesh`, not both. */
export type MeshComponentOptions = MeshComponentUrlOptions | MeshComponentMeshOptions;

/**
 * Attach to an entity to give it a 3-D mesh.
 *
 * There are two ways to use this component:
 *
 * 1. **URL mode** — provide a `url` and the {@link MeshLoaderSystem} will
 *    asynchronously load the mesh via Babylon's `SceneLoader`.
 * 2. **Direct mesh mode** — provide an already-created Babylon.js `Mesh`
 *    (e.g. from `MeshBuilder`). The component is immediately in the
 *    `'loaded'` state and no async loading takes place.
 *
 * When the component is removed from an entity, the loaded meshes are
 * automatically disposed.
 *
 * @example
 * ```ts
 * // URL mode – load from a file
 * const helmet = game.createEntity("Helmet");
 * helmet.addComponent(new MeshComponent({
 *     url: "https://models.babylonjs.com/DamagedHelmet/DamagedHelmet.gltf",
 * }));
 *
 * // Direct mesh mode – use an existing mesh
 * import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
 * const box = MeshBuilder.CreateBox("Box", { size: 0.25 }, scene);
 * const entity = game.createEntity("Box");
 * entity.addComponent(new MeshComponent({
 *     mesh: box,
 *     position: { x: 0, y: 1, z: 3 },
 * }));
 * ```
 */
export class MeshComponent extends Component {
    /** URL of the mesh file (glTF, glb, obj, etc.). Only set in URL mode. */
    url?: string;

    /**
     * Optional root path prepended to the filename when loading.
     * If omitted it is derived from {@link url} automatically.
     */
    rootUrl?: string;

    /** Current loading state. The system transitions this automatically. */
    state: LoadState = 'pending';

    /** The root transform created by the loader. Set by {@link MeshLoaderSystem}. */
    rootNode?: TransformNode;

    /** All individual meshes created by the loader. Set by {@link MeshLoaderSystem}. */
    meshes: AbstractMesh[] = [];

    /** If loading failed, the error is stored here. */
    error?: unknown;

    /** Optional position to place the mesh at after loading. */
    position?: { x: number; y: number; z: number };

    /** Optional rotation (Euler angles in radians) to apply after loading. */
    rotation?: { x: number; y: number; z: number };

    /** Optional uniform or per-axis scale. */
    scaling?: number | { x: number; y: number; z: number };

    private dirty: boolean = false;

    private _isPickable: boolean = true;
    public get isPickable(): boolean { return this._isPickable; }
    public set isPickable(value: boolean) {
        this._isPickable = value;
        this.updatePickable();
    }

    constructor(options: MeshComponentOptions) {
        super();
        this.position = options.position;
        this.rotation = options.rotation;
        this.scaling = options.scaling;

        if ('mesh' in options && options.mesh) {
            // Direct mesh — mark as loaded immediately
            this.rootNode = options.mesh;
            this.meshes = [options.mesh];
            this.dirty = true;
            this.state = 'loaded';
        } else {
            this.url = options.url;
            this.rootUrl = options.rootUrl;
        }
    }

    /**
     * Apply {@link position}, {@link rotation}, and {@link scaling} to the
     * current {@link rootNode}. Called automatically by the constructor (for
     * direct meshes) and by the {@link MeshLoaderSystem} (for URL-loaded
     * meshes).
     */
    applyTransforms(): void {
        if (!this.rootNode) return;
        if (this.position) {
            this.rootNode.position.set(
                this.position.x,
                this.position.y,
                this.position.z,
            );
        }
        if (this.rotation) {
            this.rootNode.rotation.set(
                this.rotation.x,
                this.rotation.y,
                this.rotation.z,
            );
        }
        if (this.scaling != null) {
            const s =
                typeof this.scaling === 'number'
                    ? {x: this.scaling, y: this.scaling, z: this.scaling}
                    : this.scaling;
            this.rootNode.scaling.set(s.x, s.y, s.z);
        }
    }

    /**
     * Dispose of all loaded meshes when the component is removed.
     */
    onRemove(): void {
        for (const mesh of this.meshes) {
            mesh.dispose(false, true);
        }
        this.rootNode?.dispose(false);
        this.meshes = [];
        this.rootNode = undefined;
        this.dirty = false;
    }

    onUpdate(_delta: number) {
        if (this.dirty) {
            this.applyTransforms();
            this.dirty = false;
        }
    }

    /**
     * Increment the current rotation by the given Euler angles (in radians).
     *
     * @param x - Delta rotation around the X axis.
     * @param y - Delta rotation around the Y axis.
     * @param z - Delta rotation around the Z axis.
     */
    rotate(x: number, y: number, z: number) {
        if (this.rotation) {
            this.rotation.x += x;
            this.rotation.y += y;
            this.rotation.z += z;

        } else {
            this.rotation = new Vector3(x, y, z);
        }
        this.dirty = true;
    }

    /**
     * Set the rotation to the given Euler angles (in radians), replacing any
     * previous rotation.
     *
     * @param x - Rotation around the X axis.
     * @param y - Rotation around the Y axis.
     * @param z - Rotation around the Z axis.
     */
    setRotation(x: number, y: number, z: number) {
        if (this.rotation) {
            this.rotation.x = x;
            this.rotation.y = y;
            this.rotation.z = z;
        } else {
            this.rotation = new Vector3(x, y, z);
        }
        this.dirty = true;
    }

    /**
     * Translate (move) the mesh by the given delta values, relative to its
     * current position.
     *
     * @param x - Delta along the X axis.
     * @param y - Delta along the Y axis.
     * @param z - Delta along the Z axis.
     */
    translate(x: number, y: number, z: number) {
        if (this.position) {
            this.position.x += x;
            this.position.y += y;
            this.position.z += z;
        } else {
            this.position = new Vector3(x, y, z);
        }
        this.dirty = true;
    }

    /**
     * Set the position to the given world-space coordinates, replacing any
     * previous position.
     *
     * @param x - Position on the X axis.
     * @param y - Position on the Y axis.
     * @param z - Position on the Z axis.
     */
    setPosition(x: number, y: number, z: number) {
        if (this.position) {
            this.position.x = x;
            this.position.y = y;
            this.position.z = z;
        } else {
            this.position = new Vector3(x, y, z);
        }
        this.dirty = true;
    }

    /**
     * Multiply the current scaling by the given per-axis factors.
     *
     * @param x - Scale factor along the X axis.
     * @param y - Scale factor along the Y axis.
     * @param z - Scale factor along the Z axis.
     */
    scale(x: number, y: number, z: number) {
        if (this.scaling != null) {
            const s =
                typeof this.scaling === 'number'
                    ? {x: this.scaling, y: this.scaling, z: this.scaling}
                    : this.scaling;
            this.scaling = new Vector3(s.x * x, s.y * y, s.z * z);
        } else {
            this.scaling = new Vector3(x, y, z);
        }
        this.dirty = true;
    }

    /**
     * Set the scaling to the given per-axis values, replacing any previous
     * scaling.
     *
     * @param x - Scale on the X axis.
     * @param y - Scale on the Y axis.
     * @param z - Scale on the Z axis.
     */
    setScale(x: number, y: number, z: number) {
        if (this.scaling != null && typeof this.scaling !== 'number') {
            this.scaling.x = x;
            this.scaling.y = y;
            this.scaling.z = z;
        } else {
            this.scaling = new Vector3(x, y, z);
        }
        this.dirty = true;
    }

    /** Set the mesh's pickability. */
    private updatePickable() {
        this.meshes.forEach(mesh => {
            mesh.isPickable = this.isPickable;
        })
    }
}

