import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Component } from '../core/component';

/** Loading lifecycle state for async components. */
export type LoadState = 'pending' | 'loading' | 'loaded' | 'error';

/**
 * Attach to an entity to load a 3-D mesh from a URL.
 *
 * The {@link MeshLoaderSystem} picks up entities with a `MeshComponent` in
 * `'pending'` state, loads the mesh via Babylon's `SceneLoader`, and populates
 * {@link rootNode} and {@link meshes} once complete.
 *
 * When the component is removed from an entity, the loaded meshes are
 * automatically disposed.
 *
 * @example
 * ```ts
 * const entity = game.createEntity("Helmet");
 * entity.addComponent(new MeshComponent({
 *     url: "https://models.babylonjs.com/DamagedHelmet/DamagedHelmet.gltf",
 * }));
 * ```
 */
export class MeshComponent extends Component {
    /** URL of the mesh file (glTF, glb, obj, etc.). */
    url: string;

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

    constructor(options: {
        url: string;
        rootUrl?: string;
        position?: { x: number; y: number; z: number };
        rotation?: { x: number; y: number; z: number };
        scaling?: number | { x: number; y: number; z: number };
    }) {
        super();
        this.url = options.url;
        this.rootUrl = options.rootUrl;
        this.position = options.position;
        this.rotation = options.rotation;
        this.scaling = options.scaling;
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

