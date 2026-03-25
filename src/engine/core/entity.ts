import type { ComponentClass, IComponent, IEntity } from './types';

let nextEntityId = 0;

/**
 * Reset the auto-incrementing entity ID counter back to `0`.
 *
 * Intended for **testing only** so that entity IDs are deterministic between
 * test runs.
 */
export function resetEntityIdCounter(): void {
    nextEntityId = 0;
}

/**
 * Default {@link IEntity} implementation.
 *
 * Each entity receives a unique auto-incrementing numeric {@link Entity.id | id}
 * and maintains a map of attached {@link IComponent | components} keyed by class name.
 *
 * @example
 * ```ts
 * const entity = new Entity("Player");
 * entity.addComponent(new HealthComponent());
 * ```
 */
export class Entity implements IEntity {
    /** @inheritDoc */
    readonly id: number;
    /** @inheritDoc */
    name: string;
    /** @inheritDoc */
    enabled = true;

    private readonly _components = new Map<string, IComponent>();
    private _destroyed = false;
    private _onDestroy?: (entity: Entity) => void;
    private _onComponentAdded?: (entity: Entity, key: string) => void;
    private _onComponentRemoved?: (entity: Entity, key: string) => void;

    /** @inheritDoc */
    get components(): ReadonlyMap<string, IComponent> {
        return this._components;
    }

    /** Whether this entity has been destroyed. */
    get destroyed(): boolean {
        return this._destroyed;
    }

    /**
     * @param name - Human-readable label. Defaults to `"Entity_{id}"`.
     * @param onDestroy - Internal callback invoked when the entity is destroyed
     *   so the engine can remove it from its collection.
     * @param onComponentAdded - Internal callback invoked after a component is
     *   attached so the engine's {@link ComponentIndex} can be updated.
     * @param onComponentRemoved - Internal callback invoked after a component is
     *   detached so the engine's {@link ComponentIndex} can be updated.
     */
    constructor(
        name?: string,
        onDestroy?: (entity: Entity) => void,
        onComponentAdded?: (entity: Entity, key: string) => void,
        onComponentRemoved?: (entity: Entity, key: string) => void,
    ) {
        this.id = nextEntityId++;
        this.name = name ?? `Entity_${this.id}`;
        this._onDestroy = onDestroy;
        this._onComponentAdded = onComponentAdded;
        this._onComponentRemoved = onComponentRemoved;
    }

    /** @inheritDoc */
    addComponent<T extends IComponent>(component: T): T {
        if (this._destroyed) {
            throw new Error(
                `Cannot add component to destroyed entity "${this.name}"`,
            );
        }
        const key = component.constructor.name;
        if (this._components.has(key)) {
            throw new Error(
                `Entity "${this.name}" already has component "${key}"`,
            );
        }
        component.entity = this;
        this._components.set(key, component);
        component.onAdd?.();
        this._onComponentAdded?.(this, key);
        return component;
    }

    /** @inheritDoc */
    removeComponent<T extends IComponent>(
        componentClass: ComponentClass<T>,
    ): void {
        const key = componentClass.name;
        const component = this._components.get(key);
        if (!component) {
            return;
        }
        component.onRemove?.();
        component.entity = undefined;
        this._components.delete(key);
        this._onComponentRemoved?.(this, key);
    }

    /** @inheritDoc */
    getComponent<T extends IComponent>(
        componentClass: ComponentClass<T>,
    ): T | undefined {
        return this._components.get(componentClass.name) as T | undefined;
    }

    /** @inheritDoc */
    hasComponent<T extends IComponent>(
        componentClass: ComponentClass<T>,
    ): boolean {
        return this._components.has(componentClass.name);
    }

    /** @inheritDoc */
    destroy(): void {
        if (this._destroyed) return;
        this._destroyed = true;
        for (const [key, component] of this._components) {
            component.onRemove?.();
            component.entity = undefined;
            this._onComponentRemoved?.(this, key);
        }
        this._components.clear();
        this._onDestroy?.(this);
    }
}
