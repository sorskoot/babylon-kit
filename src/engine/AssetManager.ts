import {AssetContainer, InstantiatedEntries, type Node, Scene, Texture, TransformNode} from '@babylonjs/core';
import "@babylonjs/loaders";
import '@babylonjs/loaders/glTF';
import "./extensions/sorskoot-gltf-extension";
import {LoadAssetContainerAsync} from '@babylonjs/core/Loading/sceneLoader';
import {registerBuiltInLoaders} from '@babylonjs/loaders';

export class AssetManager {
    private textures: Map<string, Texture> = new Map();
    private assets: Map<string, AssetContainer> = new Map();
    private instances: Map<string, InstantiatedEntries[]> = new Map();

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
     * Creates a clone of a previously loaded model and adds it to the scene.
     * Uses full clones (not GPU instances) so that metadata and hierarchy are preserved.
     * @param key - The key used when the model was loaded via {@link loadModel}.
     * @param instanceName - Optional prefix applied to every cloned node name.
     * @returns The instantiated entries containing root nodes, skeletons and animation groups.
     */
    public instantiate(key: string, instanceName?: string): InstantiatedEntries {
        const container = this.assets.get(key);
        if (!container) {
            throw new Error(`Model '${key}' not loaded. Call loadModel() first.`);
        }

        const entries = container.instantiateModelsToScene(
            instanceName ? (name) => `${instanceName}_${name}` : undefined,
            false,
            {doNotInstantiate: true},
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

        for (const container of this.assets.values()) {
            container.dispose();
        }
        this.assets.clear();
    }
}
