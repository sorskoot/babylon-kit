import {System} from '../core/system';
import {MeshComponent} from '../components/meshComponent';
import {LoadAssetContainerAsync} from '@babylonjs/core/Loading/sceneLoader';
import type {IGameEngine} from '../core/types';

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
        for (const entity of this._engine.getEntitiesWithComponent(MeshComponent)) {
            const mc = entity.getComponent(MeshComponent);
            if (!mc || mc.state !== 'pending') continue;

            // Direct-mesh components have no url — nothing to load
            if (!mc.url) continue;

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
                mc.url!,
                scene,
            );

            mc.meshes = result.meshes;
            mc.rootNode = result.meshes[0] ?? undefined;

            // Apply optional transform overrides
            mc.applyTransforms();

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
}

