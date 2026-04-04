import "@babylonjs/loaders/glTF";
import {Scene, AbstractMesh, TransformNode, ImportMeshAsync } from "@babylonjs/core";
import { GameObject } from "./GameObject";

export interface SceneLoadResult {
    meshes: AbstractMesh[];
    rootNodes: TransformNode[];
}

export type GameObjectFactory = (name: string, mesh: AbstractMesh, scene: Scene) => GameObject | null;

/**
 * Loads an entire .glb/.gltf scene exported from Blender (or any DCC tool)
 * and optionally maps named meshes to GameObjects using a factory function.
 *
 * Workflow:
 *   1. Export your full scene from Blender as a single .glb file.
 *   2. Place it in public/assets/models/.
 *   3. Call SceneFileLoader.load() with a factory that maps mesh names to GameObjects.
 *
 * Naming convention: name your Blender objects with prefixes like
 * "enemy_goblin", "pickup_health", "prop_barrel" — the factory receives
 * each mesh name and decides what GameObject (if any) to create.
 */
export class SceneFileLoader {

    /**
     * Loads a .glb/.gltf file into the scene.
     * Returns all imported meshes so you can inspect or further process them.
     */
    public static async load(
        rootUrl: string,
        fileName: string,
        scene: Scene
    ): Promise<SceneLoadResult> {
        const result = await ImportMeshAsync(`${rootUrl}/${fileName}`, scene);
        return {
            meshes: result.meshes,
            rootNodes: result.transformNodes,
        };
    }

    /**
     * Loads a .glb/.gltf file and automatically creates GameObjects
     * for each root-level mesh using the provided factory function.
     *
     * The factory receives each mesh's name and the mesh itself.
     * Return a GameObject to register it, or null to skip that mesh.
     *
     * Example factory:
     *   (name, mesh, scene) => {
     *       if (name.startsWith("enemy_")) return new Enemy(name, scene, mesh);
     *       if (name.startsWith("pickup_")) return new Pickup(name, scene, mesh);
     *       return null; // static scenery, no logic needed
     *   }
     */
    public static async loadWithFactory(
        rootUrl: string,
        fileName: string,
        scene: Scene,
        factory: GameObjectFactory
    ): Promise<{ meshes: AbstractMesh[]; gameObjects: Map<string, GameObject> }> {
        const result = await this.load(rootUrl, fileName, scene);
        const gameObjects = new Map<string, GameObject>();

        for (const mesh of result.meshes) {
            if (mesh.name === "__root__") continue;

            const obj = factory(mesh.name, mesh, scene);
            if (obj) {
                obj.mesh = mesh;
                gameObjects.set(mesh.name, obj);
            }
        }

        return { meshes: result.meshes, gameObjects };
    }
}
