import { System } from '../core/system';
import { MeshComponent } from '../components/meshComponent';
import { MaterialComponent } from '../components/materialComponent';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { NodeMaterial } from '@babylonjs/core/Materials/Node/nodeMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { IGameEngine } from '../core/types';

/**
 * Processes entities that have both a {@link MaterialComponent} (`'pending'`)
 * and a loaded {@link MeshComponent}, creating or loading the material and
 * assigning it to every mesh on the entity.
 *
 * @example
 * ```ts
 * game.registerSystem(new MaterialLoaderSystem());
 * ```
 */
export class MaterialLoaderSystem extends System {
    readonly name = 'materialLoader';
    private _engine!: IGameEngine;

    constructor() {
        // Run right after meshLoader (-100) but before gameplay systems (0)
        super(-90);
    }

    override onRegister(engine: IGameEngine): void {
        this._engine = engine;
    }

    update(_delta: number): void {
        for (const entity of this._engine.entities) {
            const mat = entity.getComponent(MaterialComponent);
            if (!mat || mat.state !== 'pending') continue;

            const mesh = entity.getComponent(MeshComponent);
            // Wait until the mesh is loaded before applying material
            if (mesh && mesh.state !== 'loaded') continue;

            mat.state = 'loading';
            this._resolveMaterial(mat, mesh);
        }
    }

    private async _resolveMaterial(
        mc: MaterialComponent,
        meshComp?: MeshComponent,
    ): Promise<void> {
        const scene = this._engine.scene;
        if (!scene) {
            mc.state = 'error';
            mc.error = new Error(
                'Cannot create material: engine scene not initialized',
            );
            return;
        }

        try {
            const entityName = mc.entity?.name ?? 'unknown';

            switch (mc.mode) {
                case 'standard': {
                    const mat = new StandardMaterial(
                        `${entityName}_stdMat`,
                        scene,
                    );
                    if (mc.diffuseColor) {
                        mat.diffuseColor = new Color3(
                            mc.diffuseColor.r,
                            mc.diffuseColor.g,
                            mc.diffuseColor.b,
                        );
                    }
                    if (mc.emissiveColor) {
                        mat.emissiveColor = new Color3(
                            mc.emissiveColor.r,
                            mc.emissiveColor.g,
                            mc.emissiveColor.b,
                        );
                    }
                    if (mc.diffuseTextureUrl) {
                        mat.diffuseTexture = new Texture(
                            mc.diffuseTextureUrl,
                            scene,
                        );
                    }
                    mc.material = mat;
                    break;
                }

                case 'pbr': {
                    const mat = new PBRMaterial(
                        `${entityName}_pbrMat`,
                        scene,
                    );
                    if (mc.diffuseColor) {
                        mat.albedoColor = new Color3(
                            mc.diffuseColor.r,
                            mc.diffuseColor.g,
                            mc.diffuseColor.b,
                        );
                    }
                    if (mc.diffuseTextureUrl) {
                        mat.albedoTexture = new Texture(
                            mc.diffuseTextureUrl,
                            scene,
                        );
                    }
                    if (mc.metallic != null) mat.metallic = mc.metallic;
                    if (mc.roughness != null) mat.roughness = mc.roughness;
                    if (mc.emissiveColor) {
                        mat.emissiveColor = new Color3(
                            mc.emissiveColor.r,
                            mc.emissiveColor.g,
                            mc.emissiveColor.b,
                        );
                    }
                    mc.material = mat;
                    break;
                }

                case 'url': {
                    if (!mc.url) {
                        throw new Error(
                            'MaterialComponent mode is "url" but no url was provided',
                        );
                    }
                    const mat = await NodeMaterial.ParseFromFileAsync(
                        `${entityName}_nodeMat`,
                        mc.url,
                        scene,
                    );
                    mat.build();
                    mc.material = mat;
                    break;
                }
            }

            // Apply material to all meshes on the entity
            if (mc.material && meshComp) {
                for (const mesh of meshComp.meshes) {
                    mesh.material = mc.material;
                }
            }

            mc.state = 'loaded';
        } catch (e) {
            mc.state = 'error';
            mc.error = e;
            console.error(
                `[MaterialLoaderSystem] Failed to resolve material:`,
                e,
            );
        }
    }
}
