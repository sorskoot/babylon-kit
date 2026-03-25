import type { ComponentClass, IComponent, IEntity } from './types';

/** Shared empty set returned when no entities match a query. */
const EMPTY_SET: ReadonlySet<IEntity> = new Set<IEntity>();

/**
 * An O(1) index that maps component types to the set of entities that
 * currently carry them.
 *
 * The index is kept in sync automatically via callbacks wired into
 * {@link Entity.addComponent} and {@link Entity.removeComponent}. Systems
 * query it through {@link IGameEngine.getEntitiesWithComponent} instead of
 * iterating over every entity each frame.
 *
 * @remarks
 * - Adding a component: amortised O(1) — a `Set.add` on the existing bucket.
 * - Removing a component: O(1) — a `Set.delete` on the existing bucket.
 * - Querying: O(1) — a single `Map.get`.
 * - Entity destruction: O(k) where *k* is the number of distinct component
 *   types registered — only as a safety sweep; individual removals are also
 *   fired per-component during destruction.
 *
 * @internal This class is managed entirely by {@link GameEngine}. Consumer
 * code should use {@link IGameEngine.getEntitiesWithComponent} instead.
 */
export class ComponentIndex {
    private readonly _index = new Map<string, Set<IEntity>>();

    /**
     * Called by {@link Entity} when a component is added.
     *
     * @param entity - The entity that received the component.
     * @param key    - The component's class name (the map key used by Entity).
     */
    onComponentAdded(entity: IEntity, key: string): void {
        let bucket = this._index.get(key);
        if (!bucket) {
            bucket = new Set<IEntity>();
            this._index.set(key, bucket);
        }
        bucket.add(entity);
    }

    /**
     * Called by {@link Entity} when a component is removed.
     *
     * @param entity - The entity that lost the component.
     * @param key    - The component's class name.
     */
    onComponentRemoved(entity: IEntity, key: string): void {
        this._index.get(key)?.delete(entity);
    }

    /**
     * Safety sweep — removes an entity from **every** component bucket.
     *
     * Normally the per-component callbacks handle this during destruction,
     * but this guarantees no stale references remain even if the entity is
     * destroyed through an unexpected code path.
     *
     * @param entity - The entity being destroyed.
     */
    onEntityDestroyed(entity: IEntity): void {
        for (const bucket of this._index.values()) {
            bucket.delete(entity);
        }
    }

    /**
     * Return the live set of entities that currently have a component of the
     * given type. The returned set is a direct reference to the internal
     * bucket — iterate it but do **not** mutate it.
     *
     * @typeParam T - The component type.
     * @param componentClass - The component class to look up.
     * @returns A read-only set of matching entities (may be empty, never `undefined`).
     *
     * @example
     * ```ts
     * for (const entity of index.getEntities(MeshComponent)) {
     *     const mc = entity.getComponent(MeshComponent)!;
     *     // ...
     * }
     * ```
     */
    getEntities<T extends IComponent>(
        componentClass: ComponentClass<T>,
    ): ReadonlySet<IEntity> {
        return this._index.get(componentClass.name) ?? EMPTY_SET;
    }

    /**
     * Remove all data from the index.
     *
     * Intended for **testing only** — call this (along with
     * `resetEntityIdCounter`) to reset state between test runs.
     */
    clear(): void {
        this._index.clear();
    }
}

