import {AbstractMesh, ImportMeshAsync, Scene, Texture} from '@babylonjs/core';
import "@babylonjs/loaders";
import '@babylonjs/loaders/glTF';
import "./extensions/sorskoot-gltf-extension";
import {registerBuiltInLoaders} from '@babylonjs/loaders';

export interface LoadedModel {
    meshes: AbstractMesh[];
}

export class AssetManager {
    private textures: Map<string, Texture> = new Map();
    private models: Map<string, LoadedModel> = new Map();

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

    public async loadModel(key: string, rootUrl: string, fileName: string, scene: Scene): Promise<LoadedModel> {
        const existing = this.models.get(key);
        if (existing) return existing;

        const result =  await ImportMeshAsync(`${rootUrl}/${fileName}`, scene,
            {
                pluginOptions: {gltf: {}},
            });
        const model: LoadedModel = {meshes: result.meshes};
        this.models.set(key, model);
        return model;
    }

    public getModel(key: string): LoadedModel | undefined {
        return this.models.get(key);
    }

    public dispose(): void {
        for (const texture of this.textures.values()) {
            texture.dispose();
        }
        this.textures.clear();

        for (const model of this.models.values()) {
            for (const mesh of model.meshes) {
                mesh.dispose();
            }
        }
        this.models.clear();
    }
}
