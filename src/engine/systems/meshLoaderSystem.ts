import { System } from '../core/system';
import { MeshComponent } from '../components/meshComponent';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import type { IGameEngine } from '../core/types';

/**
 * Scans entities for {@link MeshComponent}s in `'pending'` state and loads
 * them via Babylon's `SceneLoader.ImportMeshAsync`.
 *
 * Register this system once — it handles all mesh loading automatically.
 *
 * @example
 * ```ts
 * game.registerSystem(new MeshLoaderSystem());
 * ```
 */
export class MeshLoaderSystem extends System {
    readonly name = 'meshLoader';
    private _engine!: IGameEngine;

    constructor() {
        // Run very early so meshes are available for other systems
        super(-100);
    }

    override onRegister(engine: IGameEngine): void {
        this._engine = engine;
    }

    update(_delta: number): void {
        for (const entity of this._engine.entities) {
            const mc = entity.getComponent(MeshComponent);
            if (!mc || mc.state !== 'pending') continue;

            // Mark as loading immediately so we don't kick off duplicate loads
            mc.state = 'loading';
            this._loadMesh(mc);
        }
    }

    private async _loadMesh(mc: MeshComponent): Promise<void> {
        const scene = this._engine.scene;
        if (!scene) {
            mc.state = 'error';
            mc.error = new Error(
                'Cannot load mesh: engine scene not initialized',
            );
            return;
        }

        try {

            const result = await LoadAssetContainerAsync(
                mc.url,
                scene,
            );

            mc.meshes = result.meshes;
            mc.rootNode = result.meshes[0] ?? undefined;

            // Apply optional transform overrides
            if (mc.rootNode) {
                if (mc.position) {
                    mc.rootNode.position.set(
                        mc.position.x,
                        mc.position.y,
                        mc.position.z,
                    );
                }
                if (mc.rotation) {
                    mc.rootNode.rotation.set(
                        mc.rotation.x,
                        mc.rotation.y,
                        mc.rotation.z,
                    );
                }
                if (mc.scaling != null) {
                    const s =
                        typeof mc.scaling === 'number'
                            ? { x: mc.scaling, y: mc.scaling, z: mc.scaling }
                            : mc.scaling;
                    mc.rootNode.scaling.set(s.x, s.y, s.z);
                }
            }

            mc.state = 'loaded';
            result.addToScene();
        } catch (e) {
            mc.state = 'error';
            mc.error = e;
            console.error(
                `[MeshLoaderSystem] Failed to load "${mc.url}":`,
                e,
            );
        }

    }

    /**
     * Split a full URL into `rootUrl` (directory) and `filename`.
     * If the caller supplied an explicit rootUrl, use that instead.
     */
    // private _splitUrl(
    //     url: string,
    //     explicitRootUrl?: string,
    // ): { rootUrl: string; filename: string } {
    //     if (explicitRootUrl) {
    //         const lastSlash = url.lastIndexOf('/');
    //         const filename =
    //             lastSlash >= 0 ? url.substring(lastSlash + 1) : url;
    //         return { rootUrl: explicitRootUrl, filename };
    //     }
    //
    //     const lastSlash = url.lastIndexOf('/');
    //     if (lastSlash >= 0) {
    //         return {
    //             rootUrl: url.substring(0, lastSlash + 1),
    //             filename: url.substring(lastSlash + 1),
    //         };
    //     }
    //     return { rootUrl: '', filename: url };
    // }
}

