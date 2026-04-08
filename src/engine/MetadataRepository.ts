import {TransformNode} from '@babylonjs/core/Meshes/transformNode';

// ---------------------------------------------------------------------------
// Sub-group interfaces
// Each interface mirrors one SorskootPropertyGroup subclass on the Python side.
// ---------------------------------------------------------------------------

/** Data written by GenericPropertyGroup. */
export interface IGenericData {
    id: string;
    /** Comma separated list of tags. */
    tags: string;
}

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
    generic?: IGenericData;
    spawner?: ISpawnerData;
    particles?: IParticlesData;
}

export interface ISorskootRootInfo{
    id: string;
    key: string;
    filename: string;
}

export type SorskootEntry = {
    id: string;
    name: string;
    mesh: TransformNode;
    data: ISorskootExtension;
    rootInfo: ISorskootRootInfo;
};

export enum SorskootEntryTypes {
    Spawner,
    Particles
}

/**
 * Class that stores metadata about meshes.
 *
 * It stores metadata per glb/gltf file, and per mesh/node
 *
 */
export class MetadataRepository {

    /** Primary store: entry ID → SorskootEntry */
    private readonly repository = new Map<string, SorskootEntry>();

    /** Inverted index: tag → Set of entry IDs */
    private readonly tagIndex = new Map<string, Set<string>>();

    private readonly entryTypes = new Map<SorskootEntryTypes, Set<string>>();

    register(entry: SorskootEntry): void {
        this.repository.set(entry.id, entry);

        if (entry.data.generic?.tags) {
            const tags = entry.data.generic.tags.split(',');
            for (const raw of tags) {
                const tag = raw.trim().toLowerCase();
                if (!tag) continue;
                if (!this.tagIndex.has(tag)) {
                    this.tagIndex.set(tag, new Set());
                }
                this.tagIndex.get(tag)!.add(entry.id);
            }
        }

        if (entry.data.spawner){
            if (!this.entryTypes.has(SorskootEntryTypes.Spawner)) {
                this.entryTypes.set(SorskootEntryTypes.Spawner, new Set());
            }
            this.entryTypes.get(SorskootEntryTypes.Spawner)!.add(entry.id);
        }

        if (entry.data.particles){
            if (!this.entryTypes.has(SorskootEntryTypes.Particles)) {
                this.entryTypes.set(SorskootEntryTypes.Particles, new Set());
            }
            this.entryTypes.get(SorskootEntryTypes.Particles)!.add(entry.id);
        }

        console.log(`Registered entry: ${entry.name}(${entry.id}) for ${entry.rootInfo.key}(${entry.rootInfo.id})`);
    }

    unregister(id: string): void {
        const entry = this.repository.get(id);
        if (!entry) return;

        // Remove ID from every tag bucket it was in
        if (entry.data.generic?.tags) {
            const tags = entry.data.generic.tags.split(',');
            for (const raw of tags) {
                const tag = raw.trim();
                if (!tag) continue;
                const bucket = this.tagIndex.get(tag);
                if (bucket) {
                    bucket.delete(id);
                    if (bucket.size === 0) {
                        this.tagIndex.delete(tag);
                    }
                }
            }
        }

        if (entry.data.spawner) {
            this.entryTypes.get(SorskootEntryTypes.Spawner)?.delete(id);
        }
        if (entry.data.particles) {
            this.entryTypes.get(SorskootEntryTypes.Particles)?.delete(id);
        }

        this.repository.delete(id);
    }

    /** O(1) lookup by entry ID. */
    getById(id: string): SorskootEntry | undefined {
        return this.repository.get(id);
    }

    /** Returns all entries that have the given tag. O(k) where k = number of matches. */
    getByTag(tag: string): SorskootEntry[] {
        const ids = this.tagIndex.get(tag);
        if (!ids) return [];
        return Array.from(ids)
            .map(id => this.repository.get(id)!)
            .filter(Boolean);
    }

    /** Returns all entries that have ALL of the given tags. */
    getByTags(tags: string[]): SorskootEntry[] {
        if (tags.length === 0) return [];
        // Start from the smallest bucket to minimise iterations
        const sorted = [...tags].sort(
            (a, b) => (this.tagIndex.get(a)?.size ?? 0) - (this.tagIndex.get(b)?.size ?? 0),
        );
        const [first, ...rest] = sorted;
        const candidates = this.tagIndex.get(first);
        if (!candidates) return [];
        return Array.from(candidates)
            .filter(id => rest.every(tag => this.tagIndex.get(tag)?.has(id)))
            .map(id => this.repository.get(id)!)
            .filter(Boolean);
    }

    getByType(type: SorskootEntryTypes): SorskootEntry[] {
        const ids = this.entryTypes.get(type);
        if (!ids) return [];
        return Array.from(ids)
            .map(id => this.repository.get(id)!)
            .filter(Boolean);
    }
}

export const metadataRepository = new MetadataRepository();