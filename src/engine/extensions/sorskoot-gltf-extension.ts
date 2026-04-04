import { type Nullable, type TransformNode } from '@babylonjs/core';
import {
    GLTFLoader,
    type IGLTFLoaderExtension,
    type INode,
    type IScene,
    registerGLTFExtension,
} from '@babylonjs/loaders/glTF/2.0';

/**
 * Umbrella GLTF2 extension name written by the Blender add-on.
 * Must match EXTENSION_NAME in sorskootengine.py.
 */
const EXTENSION_NAME = "SORSKOOT_BJS_ENGINE";

// ---------------------------------------------------------------------------
// Sub-group interfaces
// Each interface mirrors one SorskootPropertyGroup subclass on the Python side.
// ---------------------------------------------------------------------------

/** Data written by SpawnerPropertyGroup. */
export interface ISpawnerData {
    /** Identifier of the enemy prefab to spawn (e.g. "robot"). */
    enemy: string;
    /** Number of enemies to spawn around this node. */
    count: number;
    /** Spawn radius in world units. */
    radius: number;
}

/** Data written by ParticlesPropertyGroup. */
export interface IParticlesData {
    /** Asset path or key for the particle definition JSON. */
    definition: string;
}

/**
 * Umbrella shape of the SORSKOOT_BJS_ENGINE extension block.
 * Each sub-key is optional – a node may carry any combination of groups.
 *
 * Add a new optional field here when a new SorskootPropertyGroup is added
 * on the Python side.
 */
export interface ISorskootExtension {
    spawner?:   ISpawnerData;
    particles?: IParticlesData;
}

// ---------------------------------------------------------------------------
// Loader extension
// ---------------------------------------------------------------------------

/**
 * Babylon.js GLTF2 loader extension for the Sorskoot game engine.
 *
 * When the loader encounters a node that carries a ``SORSKOOT_BJS_ENGINE``
 * extension block, this extension reads all sub-group data and stores the
 * whole object in the resulting {@link TransformNode}'s ``metadata.sorskoot``
 * property so that game code can read it at runtime:
 *
 * ```typescript
 * import type { ISorskootExtension } from './sorskoot-gltf-extension';
 *
 * const data = mesh.metadata?.sorskoot as ISorskootExtension;
 * if (data?.spawner) {
 *     spawnEnemies(data.spawner.enemy, data.spawner.count, data.spawner.radius);
 * }
 * if (data?.particles) {
 *     attachParticles(data.particles.definition, mesh);
 * }
 * ```
 */
export class SorskootGLTFExtension implements IGLTFLoaderExtension {
    /** Must match EXTENSION_NAME so Babylon.js routes matching nodes here. */
    readonly name = EXTENSION_NAME;
    public enabled = true;
    /** Lower order = higher priority; 100 is a safe default for custom extensions. */
    public order = 100;

    private _loader: GLTFLoader;

    constructor(loader: GLTFLoader) {
        this._loader = loader;
    }

    public dispose(): void {
        (this as any)._loader = null;
    }

    /**
     * Called by the Babylon.js GLTF2 loader for every node in the file.
     *
     * Returns ``null`` when the node has no ``SORSKOOT_BJS_ENGINE`` extension
     * block, letting the loader fall through to its default behaviour.
     *
     * When the block is present, delegates to the inner loader with a wrapped
     * ``assign`` callback that injects the full extension data into
     * ``babylonMesh.metadata.sorskoot`` before handing the node back to the
     * scene.  All sub-groups (spawner, particles, future groups…) are stored
     * together so no data is lost.
     *
     * @param context  Debug context string provided by the loader.
     * @param node     The raw GLTF node being loaded.
     * @param assign   Callback invoked by the loader with the finished node.
     * @returns A Promise resolving to the loaded TransformNode, or null.
     */
    public loadNodeAsync(
        context: string,
        node: INode,
        assign: (babylonMesh: TransformNode) => void,
    ): Nullable<Promise<TransformNode>> {

        const extensionData = node.extensions?.[this.name] as ISorskootExtension | undefined;

        // No Sorskoot data on this node – use default loader behaviour.
        if (!extensionData) {
            return null;
        }
        console.log(node);
        // Delegate actual node loading; intercept assign to attach metadata.
        return this._loader.loadNodeAsync(context, node, (babylonMesh) => {
            babylonMesh.metadata = babylonMesh.metadata ?? {};
            // Store the full umbrella object so any combination of sub-groups
            // is available to game code without needing individual checks here.
            babylonMesh.metadata.sorskoot = extensionData satisfies ISorskootExtension;
            assign(babylonMesh);
        });
    }

    /**
     * Reserved for future Sorskoot scene-level extension data.
     * @returns null – scene loading is not overridden.
     */
    public loadSceneAsync(_context: string, _scene: IScene): Nullable<Promise<void>> {
        return null;
    }
}

registerGLTFExtension(EXTENSION_NAME, false, async (loader) => {
    return new SorskootGLTFExtension(loader as GLTFLoader);
});