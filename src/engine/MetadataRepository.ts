import {AbstractMesh} from '@babylonjs/core';
import {ISorskootExtension} from './extensions/sorskoot-gltf-extension';

export type SorskootEntry = {
    meshId: string;
    meshName: string;
    mesh: AbstractMesh;
    data: ISorskootExtension;
};

/**
 * Class that stores metadata about meshes.
 *
 * It stores metadata per glb/gltf file, and per mesh/node
 *
 */
class MetadataRepository {
    registerMesh(entry: SorskootEntry): void {

    }

    unregisterMesh(meshId: string): void {

    }

}

export const metadataRepository = new MetadataRepository();

/*

Rough idea:

type SorskootEntry = {
meshId: string;
meshName: string;
mesh: AbstractMesh;
data: ISorskootExtension;
};

class SorskootMetadataRepository {
registerMesh(mesh: AbstractMesh): void;
unregisterMesh(mesh: AbstractMesh): void;
registerMany(meshes: AbstractMesh[]): void;
getByMeshId(id: string): SorskootEntry | undefined;
getWithSpawner(): SorskootEntry[];
findSpawnersByEnemy(enemy: string): SorskootEntry[];
getWithParticles(): SorskootEntry[];
findParticlesByDefinition(definition: string): SorskootEntry[];
}

*/