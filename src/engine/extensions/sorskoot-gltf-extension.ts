import {type Nullable, type TransformNode} from '@babylonjs/core';
import {
    GLTFLoader,
    type IGLTFLoaderExtension,
    type INode,
    type IScene,
    registerGLTFExtension,
} from '@babylonjs/loaders/glTF/2.0';
import {ISorskootExtension, ISorskootRootInfo, metadataRepository} from '../MetadataRepository';

/**
 * Umbrella GLTF2 extension name written by the Blender add-on.
 * Must match EXTENSION_NAME in sorskootengine.py.
 */
const EXTENSION_NAME = 'SORSKOOT_BJS_ENGINE';

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
    private _id: string;
    private _filename: string;
    private _key: string;

    constructor(loader: GLTFLoader) {
        this._loader = loader;
        const loaderOptions = (this._loader.parent.extensionOptions ?? {})[EXTENSION_NAME] as ISorskootRootInfo | undefined;
        if (!loaderOptions) {
            throw new Error(`SorskootGLTFExtension: No root-level extension options found for ${EXTENSION_NAME}. Metadata entries will be registered without root info.`);
        }
        this._id = loaderOptions.id;
        this._filename = loaderOptions.filename;
        this._key = loaderOptions.key;
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

        // Delegate actual node loading; intercept assign to attach metadata.
        return this._loader.loadNodeAsync(context, node, (babylonMesh) => {
            // console.log('loader', babylonMesh);
            // console.log('loader-node', node);

            babylonMesh.metadata = babylonMesh.metadata ?? {};
            // Store the full umbrella object so any combination of sub-groups
            // is available to game code without needing individual checks here.
            babylonMesh.metadata.sorskoot = extensionData satisfies ISorskootExtension;

            // register metadata with the SorskootMetadataRepository
            metadataRepository.register({
                id:       extensionData.generic?.id ?? babylonMesh.id,
                name:     babylonMesh.name,
                data:     extensionData satisfies ISorskootExtension,
                mesh:     babylonMesh,
                rootInfo: {
                    id:this._id,
                    filename:this._filename,
                    key:this._key,
                },
            });

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

