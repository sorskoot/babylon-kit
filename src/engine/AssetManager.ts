import {AssetContainer, InstantiatedEntries, Matrix, Mesh, type Node, Scene, Texture, TransformNode} from '@babylonjs/core';
import "@babylonjs/loaders";
import '@babylonjs/loaders/glTF';
import "./extensions/sorskoot-gltf-extension";
import {LoadAssetContainerAsync} from '@babylonjs/core/Loading/sceneLoader';
import {registerBuiltInLoaders} from '@babylonjs/loaders';

export interface InstantiateOptions {
    /**
     * When `true`, every node is fully cloned (preserves all metadata but
     * produces one draw call per mesh).  When `false` (the default), geometry
     * meshes are GPU-instanced while metadata-tagged nodes are still cloned.
     * Ignored when {@link thinInstance} is `true`.
     */
    forceClone?: boolean;

    /**
     * When `true`, uses GPU thin instancing instead of regular instancing.
     * Thin instances share geometry, material **and** draw call — ideal for
     * scattering large numbers of identical objects (trees, tiles, rocks …).
     *
     * Returns a {@link ThinInstanceResult} instead of `InstantiatedEntries`.
     * Call {@link ThinInstanceResult.addInstance} or
     * {@link ThinInstanceResult.setAll} to place copies in the scene.
     */
    thinInstance?: boolean;
}

/**
 * Wraps a set of source meshes that use GPU thin instancing.
 *
 * Every call to {@link addInstance} or {@link setAll} feeds world-space
 * transform matrices into a per-mesh GPU buffer.  All instances of each
 * source mesh are drawn in **one draw call**, making this the most
 * efficient option for large instance counts (hundreds / thousands).
 *
 * For multi-mesh models the local offset of each sub-mesh is automatically
 * baked into the thin-instance matrices so the model structure is preserved.
 */
export class ThinInstanceResult {
    private readonly _entries: ReadonlyArray<{ mesh: Mesh; localMatrix: Matrix }>;

    /** @internal */
    constructor(meshes: Mesh[]) {
        this._entries = meshes.map(mesh => ({
            mesh,
            localMatrix: mesh.computeWorldMatrix(true).clone(),
        }));
    }

    /** The source meshes that carry the thin-instance buffers. */
    get meshes(): Mesh[] {
        return this._entries.map(e => e.mesh);
    }

    /** Number of thin instances currently active. */
    get count(): number {
        return this._entries[0]?.mesh.thinInstanceCount ?? 0;
    }

    /**
     * Adds a single thin instance at the given world transform.
     *
     * The local offset of each sub-mesh within the model is applied
     * automatically.
     *
     * @param matrix  Desired world matrix for this instance.
     * @param refresh Whether to push the buffer to the GPU immediately
     *                (default `true`).  Set to `false` when adding many
     *                instances in a loop, then call {@link refreshBuffers}
     *                once at the end.
     * @returns The thin instance index (can be used with
     *          {@link setInstanceMatrix}).
     */
    addInstance(matrix: Matrix, refresh = true): number {
        let index = -1;
        for (const {mesh, localMatrix} of this._entries) {
            index = mesh.thinInstanceAdd(localMatrix.multiply(matrix), refresh);
        }
        return index;
    }

    /**
     * Bulk-set **all** instance transforms at once.
     *
     * Replaces any previously added instances.  Much more efficient than
     * calling {@link addInstance} in a loop because the entire buffer is
     * uploaded once.
     *
     * @param matrices     Array of world matrices, one per desired instance.
     * @param staticBuffer Mark the GPU buffer as static for better
     *                     performance (default `true`).  Set to `false` if
     *                     you plan to call {@link setAll} or
     *                     {@link setInstanceMatrix} frequently.
     */
    setAll(matrices: Matrix[], staticBuffer = true): void {
        const tmpMatrix = new Matrix();
        for (const {mesh, localMatrix} of this._entries) {
            const buffer = new Float32Array(16 * matrices.length);
            for (let i = 0; i < matrices.length; i++) {
                localMatrix.multiplyToRef(matrices[i], tmpMatrix);
                tmpMatrix.copyToArray(buffer, i * 16);
            }
            mesh.thinInstanceSetBuffer("matrix", buffer, 16, staticBuffer);
        }
    }

    /**
     * Updates the world matrix of an existing thin instance.
     *
     * @param index   Index returned by {@link addInstance}.
     * @param matrix  New world matrix.
     * @param refresh Whether to push the change to the GPU immediately.
     */
    setInstanceMatrix(index: number, matrix: Matrix, refresh = true): void {
        for (const {mesh, localMatrix} of this._entries) {
            mesh.thinInstanceSetMatrixAt(index, localMatrix.multiply(matrix), refresh);
        }
    }

    /**
     * Pushes pending buffer changes to the GPU.
     *
     * Only needed after a batch of {@link addInstance} or
     * {@link setInstanceMatrix} calls made with `refresh = false`.
     */
    refreshBuffers(): void {
        for (const {mesh} of this._entries) {
            mesh.thinInstanceBufferUpdated("matrix");
        }
    }

    /**
     * Refreshes bounding info taking all thin instances into account.
     * Call after adding / moving instances if you rely on frustum culling
     * or picking.
     */
    refreshBoundingInfo(): void {
        for (const {mesh} of this._entries) {
            mesh.thinInstanceRefreshBoundingInfo(true);
        }
    }

    /** Removes all thin instances and resets the meshes to normal rendering. */
    dispose(): void {
        for (const {mesh} of this._entries) {
            mesh.thinInstanceSetBuffer("matrix", null);
        }
    }
}

export class AssetManager {
    private textures: Map<string, Texture> = new Map();
    private assets: Map<string, AssetContainer> = new Map();
    private instances: Map<string, InstantiatedEntries[]> = new Map();
    private thinInstances: Map<string, ThinInstanceResult> = new Map();
    private addedToScene: Set<string> = new Set();

    constructor() {
        registerBuiltInLoaders();
    }

    public loadTexture(key: string, url: string, scene: Scene): Texture {
        const existing = this.textures.get(key);
        if (existing) return existing;

        const texture = new Texture(url, scene);
        this.textures.set(key, texture);
        return texture;
    }

    public getTexture(key: string): Texture | undefined {
        return this.textures.get(key);
    }

    public async loadModel(key: string, rootUrl: string, fileName: string, scene: Scene): Promise<AssetContainer> {
        const existing = this.assets.get(key);
        if (existing) return existing;
        const options = {
            pluginOptions: {
                gltf: {
                    extensionOptions: {
                        SORSKOOT_BJS_ENGINE: {
                            filename: fileName,
                            key: key,
                            id: crypto.randomUUID()
                        },
                    }
                }
            },
        };
        const container = await LoadAssetContainerAsync(`${rootUrl}/${fileName}`, scene, options);
        this.assets.set(key, container);
        return container;
    }

    /**
     * Creates an instance of a previously loaded model and adds it to the scene.
     *
     * By default, geometry meshes are GPU-instanced (one draw call per unique
     * mesh + material pair) while nodes carrying Sorskoot metadata are fully
     * cloned so that {@link findByMetadataId} keeps working.
     *
     * Pass `{ forceClone: true }` to fall back to full clones for every node
     * (more draw calls, but each clone gets its own metadata and geometry).
     *
     * @param key - The key used when the model was loaded via {@link loadModel}.
     * @param instanceName - Optional prefix applied to every cloned / instanced node name.
     * @param options - Optional settings to control instancing behaviour.
     * @returns The instantiated entries containing root nodes, skeletons and animation groups.
     */
    public instantiate(key: string, instanceName?: string, options?: InstantiateOptions & { thinInstance?: false }): InstantiatedEntries;
    /**
     * Creates a thin-instance setup for a previously loaded model.
     *
     * The container's meshes are added to the scene once and returned wrapped
     * in a {@link ThinInstanceResult}.  Use the result's
     * {@link ThinInstanceResult.addInstance | addInstance} /
     * {@link ThinInstanceResult.setAll | setAll} methods to place copies.
     *
     * Calling this again for the same key returns the **same**
     * `ThinInstanceResult` so you can keep adding instances.
     *
     * @param key - The key used when the model was loaded via {@link loadModel}.
     * @param instanceName - Ignored for thin instances.
     * @param options - Must include `{ thinInstance: true }`.
     * @returns A {@link ThinInstanceResult} for managing the thin instances.
     */
    public instantiate(key: string, instanceName?: string, options?: InstantiateOptions & { thinInstance: true }): ThinInstanceResult;
    public instantiate(key: string, instanceName?: string, options?: InstantiateOptions): InstantiatedEntries | ThinInstanceResult {
        const container = this.assets.get(key);
        if (!container) {
            throw new Error(`Model '${key}' not loaded. Call loadModel() first.`);
        }

        // ── Thin-instance path ──────────────────────────────────────────
        if (options?.thinInstance) {
            const existing = this.thinInstances.get(key);
            if (existing) return existing;

            // Source meshes must be in the scene for thin instances to render
            if (!this.addedToScene.has(key)) {
                container.addAllToScene();
                this.addedToScene.add(key);
            }

            const meshes = container.meshes.filter((m): m is Mesh => m instanceof Mesh);
            const result = new ThinInstanceResult(meshes);
            this.thinInstances.set(key, result);
            return result;
        }

        // ── Regular instance / clone path ───────────────────────────────
        const doNotInstantiate = options?.forceClone
            ? true
            : (node: Node) => !!(node as TransformNode).metadata?.sorskoot;

        const entries = container.instantiateModelsToScene(
            instanceName ? (name) => `${instanceName}_${name}` : undefined,
            false,
            {doNotInstantiate},
        );

        // Track for disposal
        if (!this.instances.has(key)) {
            this.instances.set(key, []);
        }
        this.instances.get(key)!.push(entries);

        return entries;
    }

    /**
     * Searches an {@link InstantiatedEntries} result for a node whose Sorskoot
     * metadata generic id matches the given value.
     *
     * @param entries - The entries returned by {@link instantiate}.
     * @param metadataId - The `generic.id` set in the Blender add-on.
     * @returns The matching {@link TransformNode}, or `null` if not found.
     */
    public static findByMetadataId(entries: InstantiatedEntries, metadataId: string): TransformNode | null {
        for (const root of entries.rootNodes) {
            const match = AssetManager._findInHierarchy(root, metadataId);
            if (match) return match;
        }
        return null;
    }

    private static _findInHierarchy(node: Node, metadataId: string): TransformNode | null {
        if ((node as TransformNode).metadata?.sorskoot?.generic?.id === metadataId) {
            return node as TransformNode;
        }
        for (const child of node.getChildren()) {
            const found = AssetManager._findInHierarchy(child, metadataId);
            if (found) return found;
        }
        return null;
    }

    public getModel(key: string): AssetContainer | undefined {
        return this.assets.get(key);
    }

    public dispose(): void {
        for (const texture of this.textures.values()) {
            texture.dispose();
        }
        this.textures.clear();

        for (const instanceList of this.instances.values()) {
            for (const entries of instanceList) {
                entries.dispose();
            }
        }
        this.instances.clear();

        for (const thinResult of this.thinInstances.values()) {
            thinResult.dispose();
        }
        this.thinInstances.clear();
        this.addedToScene.clear();

        for (const container of this.assets.values()) {
            container.dispose();
        }
        this.assets.clear();
    }
}
