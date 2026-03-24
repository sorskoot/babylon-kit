import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Component } from '../core/component';

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

    constructor(options: MeshComponentOptions) {
        super();
        this.position = options.position;
        this.rotation = options.rotation;
        this.scaling = options.scaling;

        if ('mesh' in options && options.mesh) {
            // Direct mesh — mark as loaded immediately
            this.rootNode = options.mesh;
            this.meshes = [options.mesh];
            this.applyTransforms();
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
                    ? { x: this.scaling, y: this.scaling, z: this.scaling }
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
    }
}

