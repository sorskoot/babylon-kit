import {AbstractMesh, AssetContainer, Scene, Texture} from '@babylonjs/core';
import "@babylonjs/loaders";
import '@babylonjs/loaders/glTF';
import "./extensions/sorskoot-gltf-extension";
import {LoadAssetContainerAsync} from '@babylonjs/core/Loading/sceneLoader';
import {registerBuiltInLoaders} from '@babylonjs/loaders';

export interface LoadedModel {
    meshes: AbstractMesh[];
}

export class AssetManager {
    private textures: Map<string, Texture> = new Map();
    private assets: Map<string, AssetContainer> = new Map();

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
                        SORSKOOT_BJS_ENGINE:{
                            filename:fileName,
                            key:key,
                            id: crypto.randomUUID()
                        },
                    }
                }},

        }
        const container = await LoadAssetContainerAsync(`${rootUrl}/${fileName}`,scene, options);

        // const result =  await ImportMeshAsync(`${rootUrl}/${fileName}`, scene,options
        //     );
        //const model: LoadedModel = {meshes: container.meshes};
        this.assets.set(key, container);
        return container;
    }

    public getModel(key: string): AssetContainer | undefined {
        return this.assets.get(key);
    }

    public dispose(): void {
        for (const texture of this.textures.values()) {
            texture.dispose();
        }
        this.textures.clear();

        for (const model of this.assets.values()) {
            for (const mesh of model.meshes) {
                mesh.dispose();
            }
        }
        this.assets.clear();
    }
}
