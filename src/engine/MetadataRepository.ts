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
    /** Whether this node should be considered a "collision" object. */
    collision: boolean;
    /** True if the object is considered a trigger and thus does not render. */
    trigger: boolean;
    /** True if the object is considered inspectable */
    inspectable: boolean;
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
 * Data written by the door property group in the Blender add-on.
 * Controls how a door node is animated when the player interacts with it.
 */
export interface IDoorData {
    /** When `true`, the door swings in the opposite (negative) direction. */
    reversed?: boolean;
    /** Maximum open angle as a fraction of 90°. `1` = fully open at 90°. Default 1. */
    max?: number;
    /** When `true`, interaction does not open the door. */
    locked?: boolean;
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
    door?: IDoorData;
}

/** Root-level context written by the loader when a GLTF file is imported. */
export interface ISorskootRootInfo {
    id: string;
    key: string;
    filename: string;
}

/**
 * A single registered node entry combining its resolved mesh, the raw Sorskoot
 * extension data, and the root file context it was loaded from.
 */
export type SorskootEntry = {
    id: string;
    name: string;
    mesh: TransformNode;
    data: ISorskootExtension;
    rootInfo: ISorskootRootInfo;
};

/**
 * Discriminator enum used to query all entries of a specific functional type
 * (e.g. all spawner nodes or all particle nodes) without iterating the full
 * repository.
 */
export enum SorskootEntryTypes {
    Spawner,
    Particles,
    Door,
    Trigger,
    Inspectable,
}

/**
 * Class that stores metadata about meshes.
 *
 * It stores metadata per glb/gltf file, and per mesh/node
 *
 */
export class MetadataRepository implements Iterable<SorskootEntry> {

    /** Primary store: entry ID → SorskootEntry */
    private readonly repository = new Map<string, SorskootEntry>();
    /** Inverted index: tag → Set of entry IDs */
    private readonly tagIndex = new Map<string, Set<string>>();
    private readonly entryTypes = new Map<SorskootEntryTypes, Set<string>>();
    /** `true` when at least one entry has been registered since the last metadata processing pass. */
    public isDirty: boolean = false;

    /**
     * Checks if entry type is set, adds it if not
     * @param type Type to check
     * @private
     */
    private ensureTypeSet(type: SorskootEntryTypes): Set<string> {
        if (!this.entryTypes.has(type)) {
            this.entryTypes.set(type, new Set());
        }
        return this.entryTypes.get(type)!;
    }

    /**
     * Adds the is if the condition is met
     * @param condition Condition to check
     * @param type Type to add
     * @param id Entry ID to add
     * @private
     */
    private addTypeIf(condition: boolean, type: SorskootEntryTypes, id: string): void {
        if (condition) {
            this.ensureTypeSet(type).add(id);
        }
    }

    /**
     * Removes the entry ID from the type bucket, and deletes the bucket if it's empty
     * @param type Type to remove
     * @param id Entry ID to remove
     * @private
     */
    private removeType(type: SorskootEntryTypes, id: string): void {
        const bucket = this.entryTypes.get(type);
        if (!bucket) return;
        bucket.delete(id);
        if (bucket.size === 0) {
            this.entryTypes.delete(type);
        }
    }

    /**
     * Register a loaded node entry.
     * Tags from `entry.data.generic.tags` are indexed automatically.
     *
     * @param entry - The entry to register.
     */
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

        this.addTypeIf(Boolean(entry.data.spawner), SorskootEntryTypes.Spawner, entry.id);
        this.addTypeIf(Boolean(entry.data.particles), SorskootEntryTypes.Particles, entry.id);
        this.addTypeIf(Boolean(entry.data.door), SorskootEntryTypes.Door, entry.id);
        this.addTypeIf(Boolean(entry.data.generic?.trigger), SorskootEntryTypes.Trigger, entry.id);
        this.addTypeIf(Boolean(entry.data.generic?.inspectable), SorskootEntryTypes.Inspectable, entry.id);

        console.log(`Registered entry: ${entry.name}(${entry.id}) for ${entry.rootInfo.key}(${entry.rootInfo.id})`);
        this.isDirty = true;
    }

    /**
     * Remove an entry and clean up all associated index entries.
     *
     * @param id - The entry ID that was used during {@link register}.
     */
    unregister(id: string): void {
        const entry = this.repository.get(id);
        if (!entry) return;

        // Remove ID from every tag bucket it was in
        if (entry.data.generic?.tags) {
            const tags = entry.data.generic.tags.split(',');
            for (const raw of tags) {
                const tag = raw.trim().toLowerCase();
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

        if (entry.data.spawner) this.removeType(SorskootEntryTypes.Spawner, id);
        if (entry.data.particles) this.removeType(SorskootEntryTypes.Particles, id);
        if (entry.data.door) this.removeType(SorskootEntryTypes.Door, id);
        if (entry.data.generic?.trigger) this.removeType(SorskootEntryTypes.Trigger, id);
        if (entry.data.generic?.inspectable) this.removeType(SorskootEntryTypes.Inspectable, id);

        this.repository.delete(id);
    }

    /** O(1) lookup by entry ID.
     *
     * @param id - The entry ID used during {@link register}.
     * @returns The {@link SorskootEntry}, or `undefined` if not found.
     */
    getById(id: string): SorskootEntry | undefined {
        return this.repository.get(id);
    }

    /**
     * Returns all entries that have the given tag. O(k) where k = number of matches.
     *
     * @param tag - The tag string to search for (case-insensitive).
     * @returns Array of matching {@link SorskootEntry} instances.
     */
    getByTag(tag: string): SorskootEntry[] {
        const key = tag.trim().toLowerCase();
        const ids = this.tagIndex.get(key);
        if (!ids) return [];
        return Array.from(ids)
            .map(id => this.repository.get(id)!)
            .filter(Boolean);
    }

    /**
     * Returns all entries that have ALL of the given tags.
     *
     * @param tags - Array of tag strings that must all be present on each returned entry.
     * @returns Array of {@link SorskootEntry} instances matching every tag.
     */
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

    /**
     * Returns all entries of the given functional type (e.g. all spawner nodes).
     *
     * @param type - The {@link SorskootEntryTypes} discriminator to filter by.
     * @returns Array of {@link SorskootEntry} instances of the requested type.
     */
    getByType(type: SorskootEntryTypes): SorskootEntry[] {
        const ids = this.entryTypes.get(type);
        if (!ids) return [];
        return Array.from(ids)
            .map(id => this.repository.get(id)!)
            .filter(Boolean);
    }

    /**
     * Allows iterating all registered entries with a `for…of` loop.
     *
     * @returns An iterator over every {@link SorskootEntry} in the repository.
     */
    [Symbol.iterator](): Iterator<SorskootEntry> {
        return this.repository.values();
    }
}

/** Singleton instance of {@link MetadataRepository} shared across the engine. */
export const metadataRepository = new MetadataRepository();